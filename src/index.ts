/**
 * @ubc-biztech/sdk — the generated client for BizTech club data.
 *
 * ```ts
 * import { createClient } from "@ubc-biztech/sdk";
 * const bt = createClient({ baseUrl: "https://api-dev.ubcbiztech.com", getToken });
 * const event = await bt.event("blueprint", 2026).get();
 * ```
 *
 * Everything under ./generated is emitted from ./resources. This file and ./core/runtime.ts
 * are the only hand-written code in the published package.
 */
export { createClient, type BtClient } from "./generated/client.js";
export * from "./generated/schemas.js";
export * from "./generated/errors.js";
export type { ClientConfig } from "./core/runtime.js";
