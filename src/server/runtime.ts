/**
 * Hand-written server runtime for generated services. This is the only place a generated
 * service touches API Gateway. Given the generated route table for a service and a
 * hand-written implementation, it produces one Lambda handler that:
 *
 *   1. matches method + path to an action (path params coerced by declared kind),
 *   2. resolves the bearer token to a principal via `impl.authenticate`,
 *   3. checks the action's `auth` against the principal's role (with `implies`),
 *   4. validates the merged input (scope + key + body/query) against the wire schema,
 *   5. calls `impl.<action>(ctx, input)`,
 *   6. validates the output (a mismatch is a 500 and a bug in the impl, never sent as-is),
 *   7. maps a thrown ActionError to its declared status, anything else to 500.
 *
 * Nothing here knows about any particular resource. ~200 lines; read it once.
 */
import type { ZodType } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type FieldKind = "string" | "integer" | "number" | "boolean" | "enum" | "json" | "array" | "object" | "record" | "ref";

export type RouteMeta = {
  key: string;
  /** impl method name, e.g. `teamsList` */
  method: string;
  http: HttpMethod;
  /** e.g. `/judging/{eventID}/{year}/teams/{id}` */
  path: string;
  query: readonly string[];
  auth: string;
  /** kind of every path/query field, for coercion from strings */
  paramKinds: Record<string, FieldKind>;
  /** which of the wire fields are scope key fields */
  scopeFields: readonly string[];
  input: ZodType;
  output: ZodType;
  /** declared error name → status */
  errors: Record<string, number>;
};

export type Roles = Record<string, { implies?: readonly string[] }>;

export type Principal = { role: string; id: string; name: string };

export type Ctx<Scope> = {
  scope: Scope;
  /** null for public actions when no token was sent */
  principal: Principal | null;
  /** the raw bearer token, for impls that need to re-check it */
  token: string | null;
  requestId: string;
};

/** Throw from an impl to answer with a declared error. `name` must be one of the action's declared errors. */
export class ActionError extends Error {
  constructor(
    override readonly name: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export type ApiGatewayEvent = {
  httpMethod?: string;
  path?: string;
  resource?: string;
  headers?: Record<string, string | undefined> | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  requestContext?: { requestId?: string; stage?: string; authorizer?: unknown };
};
export type ApiGatewayResponse = { statusCode: number; headers: Record<string, string>; body: string };

export type BaseImpl<Scope> = {
  /** Resolve a bearer token within a scope. Return null for unknown tokens. Never throw for a bad token. */
  authenticate(token: string, scope: Scope): Promise<Principal | null>;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};
const respond = (statusCode: number, body: unknown): ApiGatewayResponse => ({
  statusCode,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function compile(path: string): { re: RegExp; names: string[] } {
  const names: string[] = [];
  const re = new RegExp(
    "^" +
      path.replace(/\{(\w+)\}/g, (_, n: string) => {
        names.push(n);
        return "([^/]+)";
      }) +
      "/?$",
  );
  return { re, names };
}

function coerce(kind: FieldKind | undefined, raw: string): unknown {
  switch (kind) {
    case "integer":
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case "boolean":
      return raw === "true" ? true : raw === "false" ? false : raw;
    default:
      return raw;
  }
}

export function satisfies(roles: Roles, have: string, need: string): boolean {
  const seen = new Set<string>();
  const walk = (r: string): boolean => {
    if (r === need) return true;
    if (seen.has(r)) return false;
    seen.add(r);
    return (roles[r]?.implies ?? []).some(walk);
  };
  return walk(have);
}

export function createRouter<Scope, Impl extends BaseImpl<Scope>>(opts: {
  service: string;
  routes: readonly RouteMeta[];
  roles: Roles;
  scopeFrom: (params: Record<string, unknown>) => Scope;
  impl: Impl;
  log?: (line: Record<string, unknown>) => void;
}): (event: ApiGatewayEvent) => Promise<ApiGatewayResponse> {
  const compiled = opts.routes.map((r) => ({ r, ...compile(r.path) }));
  const log = opts.log ?? ((l) => console.log(JSON.stringify(l)));

  return async (event) => {
    const method = (event.httpMethod ?? "GET").toUpperCase();
    const requestId = event.requestContext?.requestId ?? "";
    // API Gateway with a custom domain and empty base path gives the path without a stage prefix.
    const path = (event.path ?? "/").replace(/\/+$/, "") || "/";
    if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    // 1. Route
    let match: { r: RouteMeta; params: Record<string, string> } | null = null;
    let pathMatched = false;
    for (const c of compiled) {
      const m = c.re.exec(path);
      if (!m) continue;
      pathMatched = true;
      if (c.r.http !== method) continue;
      const params: Record<string, string> = {};
      c.names.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1]!)));
      match = { r: c.r, params };
      break;
    }
    if (!match) return respond(pathMatched ? 405 : 404, { message: pathMatched ? `Method ${method} not allowed on ${path}` : `No route for ${method} ${path}` });
    const { r, params } = match;

    // 2. Assemble wire input: path params (coerced), declared query fields (coerced), body.
    const input: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) input[k] = coerce(r.paramKinds[k], v);
    for (const q of r.query) {
      const v = event.queryStringParameters?.[q];
      if (v !== undefined && v !== null && v !== "") input[q] = coerce(r.paramKinds[q], v);
    }
    if (method !== "GET" && event.body) {
      let body: unknown;
      try {
        body = JSON.parse(event.body);
      } catch {
        return respond(400, { message: "Body is not valid JSON" });
      }
      if (typeof body !== "object" || body === null || Array.isArray(body)) return respond(400, { message: "Body must be a JSON object" });
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) if (!(k in params)) input[k] = v;
    }
    const scope = opts.scopeFrom(input);

    // 3. Authenticate + authorize
    const authHeader = Object.entries(event.headers ?? {}).find(([k]) => k.toLowerCase() === "authorization")?.[1];
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim() || null;
    let principal: Principal | null = null;
    if (token) principal = await opts.impl.authenticate(token, scope);
    if (r.auth !== "public") {
      if (!token) return respond(401, { message: `${r.key} requires auth "${r.auth}"; send Authorization: Bearer <token>` });
      if (!principal) return respond(401, { message: "Token not recognized" });
      if (!satisfies(opts.roles, principal.role, r.auth)) return respond(403, { message: `${r.key} requires "${r.auth}"; this token is "${principal.role}"` });
    }

    // 4. Validate input
    const parsed = r.input.safeParse(input);
    if (!parsed.success) return respond(400, { message: `Invalid input for ${r.key}`, issues: parsed.error.issues });

    // 5. Call
    const ctx: Ctx<Scope> = { scope, principal, token, requestId };
    const started = Date.now();
    try {
      const fn = (opts.impl as unknown as Record<string, (c: Ctx<Scope>, i: unknown) => Promise<unknown>>)[r.method];
      if (typeof fn !== "function") return respond(501, { message: `${r.key} is declared but ${opts.service} has no implementation for it (impl.${r.method})` });
      const out = await fn.call(opts.impl, ctx, parsed.data); // .call: impls are usually classes
      // 6. Validate output: the declaration is the contract in both directions.
      const checked = r.output.safeParse(out);
      if (!checked.success) {
        log({ level: "error", service: opts.service, action: r.key, requestId, msg: "output does not match declaration", issues: checked.error.issues });
        return respond(500, { message: `${r.key}: implementation returned a value that does not match the declaration` });
      }
      log({ level: "info", service: opts.service, action: r.key, requestId, ms: Date.now() - started, principal: principal?.role ?? "anonymous" });
      return respond(200, checked.data);
    } catch (e) {
      // 7. Errors
      if (e instanceof ActionError) {
        const status = r.errors[e.name];
        if (status) return respond(status, { message: e.message, error: e.name, details: e.details });
        log({ level: "error", service: opts.service, action: r.key, requestId, msg: `impl threw undeclared error ${e.name}` });
        return respond(500, { message: `${r.key}: undeclared error ${e.name}: ${e.message}` });
      }
      log({ level: "error", service: opts.service, action: r.key, requestId, msg: String((e as Error)?.stack ?? e) });
      return respond(500, { message: "Internal server error" });
    }
  };
}
