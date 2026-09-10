/**
 * Hand-written runtime for the generated client. This file is NOT generated and is the
 * only place HTTP happens. It is deliberately small: path templating, auth header,
 * error mapping, and schema validation on both sides of the wire.
 */
import type { ZodType } from "zod";

// ─── Errors ───────────────────────────────────────────────────────────

/** Base class for every error the SDK throws. `name` is the semantic error name (RD4). */
export class BtError extends Error {
  override readonly name: string = "BtError";
  constructor(message: string, readonly details?: unknown) {
    super(message);
  }
}

/** The backend returned a status that the action did not declare. */
export class ApiError extends BtError {
  override readonly name = "ApiError";
  constructor(readonly action: string, readonly status: number, message: string, details?: unknown) {
    super(`${action}: HTTP ${status}: ${message}`, details);
  }
}

/** The action requires a token and `getToken` returned none. */
export class NotAuthenticatedError extends BtError {
  override readonly name = "NotAuthenticatedError";
  constructor(readonly action: string, readonly auth: string) {
    super(`${action} requires auth "${auth}" but no token is available`);
  }
}

/** The caller's input failed the declared input schema. Nothing was sent. */
export class InputError extends BtError {
  override readonly name = "InputError";
  constructor(readonly action: string, issues: unknown) {
    super(`${action}: invalid input`, issues);
  }
}

/**
 * The backend's response did not match the declared output. This means the ontology
 * is wrong about reality (RFC §9.2). Fix the declaration; do not catch this in app code.
 */
export class ContractViolationError extends BtError {
  override readonly name = "ContractViolationError";
  constructor(readonly action: string, issues: unknown, readonly raw: unknown) {
    super(`${action}: response does not match the declared shape`, issues);
  }
}

// ─── Config ───────────────────────────────────────────────────────────

export type ClientConfig = {
  /** e.g. https://api-dev.ubcbiztech.com — no trailing slash. */
  baseUrl: string;
  /** Returns the Cognito ID token, or null when signed out. Required for non-public actions. */
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  /** Override for tests or non-browser runtimes. Defaults to global fetch. */
  fetch?: typeof fetch;
  /**
   * When false, output is not validated and ContractViolationError is never thrown.
   * Default true. Turn off only in a pinch during a live event; file the drift afterwards.
   */
  validateOutput?: boolean;
};

export type ErrorCtor = new (message: string, details?: unknown) => BtError;

export type ActionMeta = {
  /** `namespace.action` */
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** May contain `{param}` segments. */
  path: string;
  query: readonly string[];
  fixedQuery: Record<string, string>;
  auth: string;
  input?: ZodType;
  output: ZodType;
  /** HTTP status → semantic error class. */
  errors: Record<number, ErrorCtor>;
};

// ─── Runtime ──────────────────────────────────────────────────────────

export class Runtime {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: ClientConfig) {
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) throw new Error("No fetch available; pass one in ClientConfig.fetch");
  }

  async call<T>(meta: ActionMeta, rawInput: unknown): Promise<T> {
    // 1. Validate input against the declaration before anything leaves the process.
    let input: Record<string, unknown> = {};
    if (meta.input) {
      const parsed = meta.input.safeParse(rawInput ?? {});
      if (!parsed.success) throw new InputError(meta.key, parsed.error.issues);
      input = parsed.data as Record<string, unknown>;
    }

    // 2. Build the URL: path params from {braces}, declared query fields, fixed query.
    const consumed = new Set<string>();
    const path = meta.path.replace(/\{(\w+)\}/g, (_, name: string) => {
      consumed.add(name);
      return encodeURIComponent(String(input[name]));
    });
    const qs = new URLSearchParams();
    for (const q of meta.query) {
      consumed.add(q);
      const v = input[q];
      if (v !== undefined && v !== null) qs.set(q, String(v));
    }
    for (const [k, v] of Object.entries(meta.fixedQuery)) qs.set(k, v);
    const url = `${this.config.baseUrl}${path}${qs.size ? `?${qs}` : ""}`;

    // 3. Body is whatever input remains, for non-GET methods.
    const headers: Record<string, string> = { Accept: "application/json" };
    let body: string | undefined;
    if (meta.method !== "GET") {
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) if (!consumed.has(k)) rest[k] = v;
      if (Object.keys(rest).length) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(rest);
      }
    }

    // 4. Auth. Public actions still send a token if one exists, because some handlers
    //    (e.g. events.list for admins) return more with one.
    const token = this.config.getToken ? await this.config.getToken() : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else if (meta.auth !== "public") throw new NotAuthenticatedError(meta.key, meta.auth);

    // 5. Call, and map the status to a declared error or ApiError.
    const res = await this.fetchImpl(url, { method: meta.method, headers, body });
    const text = await res.text();
    let data: unknown = undefined;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
          : typeof data === "string" && data
            ? data
            : res.statusText;
      const Ctor = meta.errors[res.status];
      if (Ctor) throw new Ctor(message, data);
      throw new ApiError(meta.key, res.status, message, data);
    }

    // 6. Validate output. A mismatch is the ontology being wrong, not the caller.
    if (this.config.validateOutput === false) return data as T;
    const parsed = meta.output.safeParse(data);
    if (!parsed.success) throw new ContractViolationError(meta.key, parsed.error.issues, data);
    return parsed.data as T;
  }
}
