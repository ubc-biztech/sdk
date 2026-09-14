import type { ZodType } from "zod";

// ─── Errors ───────────────────────────────────────────────────────────

export class BtError extends Error {
  override readonly name: string = "BtError";
  constructor(message: string, readonly details?: unknown) {
    super(message);
  }
}

export class ApiError extends BtError {
  override readonly name = "ApiError";
  constructor(readonly action: string, readonly status: number, message: string, details?: unknown) {
    super(`${action}: HTTP ${status}: ${message}`, details);
  }
}

export class NotAuthenticatedError extends BtError {
  override readonly name = "NotAuthenticatedError";
  constructor(readonly action: string, readonly auth: string, readonly credential: "code" | "token") {
    super(`${action} requires auth "${auth}" but ClientConfig.${credential === "code" ? "getCode" : "getToken"} returned nothing`);
  }
}

export class InputError extends BtError {
  override readonly name = "InputError";
  constructor(readonly action: string, issues: unknown) {
    super(`${action}: invalid input`, issues);
  }
}

/** The declaration is wrong about the backend. Fix the declaration; do not catch this in app code. */
export class ContractViolationError extends BtError {
  override readonly name = "ContractViolationError";
  constructor(readonly action: string, issues: unknown, readonly raw: unknown) {
    super(`${action}: response does not match the declared shape`, issues);
  }
}

// ─── Config ───────────────────────────────────────────────────────────

export type ClientConfig = {
  /** No trailing slash. */
  baseUrl: string;
  /** Sent as `X-Judging-Code` on actions whose role's credential is `code`. */
  getCode?: () => Promise<string | null | undefined> | string | null | undefined;
  /** The Cognito ID token, sent as `Authorization: Bearer` on actions whose role's credential is `token`. */
  getToken?: () => Promise<string | null | undefined> | string | null | undefined;
  fetch?: typeof fetch;
  /** Default true. Turn off only in a pinch during a live event, then file the drift. */
  validateOutput?: boolean;
};

export type ErrorCtor = new (message: string, details?: unknown) => BtError;

export type ActionMeta = {
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query: readonly string[];
  fixedQuery: Record<string, string>;
  auth: string;
  credential: "none" | "code" | "token";
  input?: ZodType;
  output: ZodType;
  errors: Record<number, ErrorCtor>;
};

// ─── Runtime ──────────────────────────────────────────────────────────

export class Runtime {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: ClientConfig) {
    const f = config.fetch ?? globalThis.fetch;
    if (!f) throw new Error("No fetch available; pass one in ClientConfig.fetch");
    // Browsers throw "Illegal invocation" when window.fetch is called with any other `this`.
    this.fetchImpl = f.bind(globalThis);
  }

  async call<T>(meta: ActionMeta, rawInput: unknown): Promise<T> {
    let input: Record<string, unknown> = {};
    if (meta.input) {
      const parsed = meta.input.safeParse(rawInput ?? {});
      if (!parsed.success) throw new InputError(meta.key, parsed.error.issues);
      input = parsed.data as Record<string, unknown>;
    }

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

    // Public actions send nothing: the backend answers a wrong code with 401 even on public routes.
    if (meta.credential === "code") {
      const code = this.config.getCode ? await this.config.getCode() : null;
      if (!code) throw new NotAuthenticatedError(meta.key, meta.auth, "code");
      headers["X-Judging-Code"] = code;
    } else if (meta.credential === "token") {
      const token = this.config.getToken ? await this.config.getToken() : null;
      if (!token) throw new NotAuthenticatedError(meta.key, meta.auth, "token");
      headers["Authorization"] = `Bearer ${token}`;
    }

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

    if (this.config.validateOutput === false) return data as T;
    const parsed = meta.output.safeParse(data);
    if (!parsed.success) throw new ContractViolationError(meta.key, parsed.error.issues, data);
    return parsed.data as T;
  }
}
