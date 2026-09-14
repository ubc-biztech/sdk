/**
 * Guardrails for people who do not understand this repo (which is everyone, soon).
 * Each test encodes one mistake that is easy to make with a wrong mental model, and
 * fails with a message that says what to do.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { api } from "../src/resources/index.js";
import { flatten } from "../src/core/define.js";

describe("guardrails", () => {
  /** The declaration files: everything in src/resources/ except the registry and the roles. */
  const declarationFiles = () => readdirSync("src/resources").filter((f) => f.endsWith(".ts") && !["index.ts", "roles.ts"].includes(f));

  it("every declaration file in src/resources/ is registered in src/resources/index.ts", () => {
    const index = readFileSync("src/resources/index.ts", "utf8");
    const unregistered = declarationFiles().filter((f) => !index.includes(`./${f.replace(/\.ts$/, ".js")}`));
    expect(unregistered, "these files exist but nothing imports them, so they generate nothing. Add an import and register their exports in src/resources/index.ts, or run `npm run new` next time").toEqual([]);
  });

  it("every exported resource is in api.resources", async () => {
    const missing: string[] = [];
    for (const f of declarationFiles()) {
      const mod = (await import(/* @vite-ignore */ `../src/resources/${f.replace(/\.ts$/, ".js")}`)) as Record<string, unknown>;
      for (const [name, v] of Object.entries(mod)) {
        const isResource = typeof v === "object" && v !== null && "singular" in v && "instance" in v;
        if (isResource && !Object.values(api.resources).includes(v as never)) missing.push(`${f}: ${name}`);
      }
    }
    expect(missing, "exported with resource() but not listed under `resources` in src/resources/index.ts, so bt.<name> does not exist").toEqual([]);
  });

  it("every generated method is self-describing (JSDoc names its auth and route)", () => {
    const client = readFileSync("src/generated/client.ts", "utf8");
    for (const a of flatten(api)) {
      const method = new RegExp(`\\n\\s+\\*/\\n\\s+${a.name.replace(/[$]/g, "\\$&")}: \\(`);
      const idx = client.search(method);
      expect(idx, `${a.key}: generated method has no JSDoc; the generator's actionDoc() is broken`).toBeGreaterThan(-1);
      const doc = client.slice(Math.max(0, idx - 800), idx);
      expect(doc, `${a.key}: JSDoc must state Auth:`).toMatch(/Auth: `\w+`/);
      expect(doc, `${a.key}: JSDoc must state Route:`).toMatch(/Route: `(GET|POST|PUT|PATCH|DELETE) \//);
    }
  });

  it("no action declares an error status the runtime cannot map (must be an HTTP status the backend can send)", () => {
    for (const a of flatten(api)) for (const [en, e] of Object.entries(a.spec.errors)) expect(e.status, `${a.key}.${en}`).toBeGreaterThanOrEqual(400);
  });

  it("the hand-written runtime stays small enough to read in one sitting", () => {
    const lines = readFileSync("src/core/runtime.ts", "utf8").split("\n").length;
    expect(lines, "src/core/runtime.ts is the only HTTP code; if it needs to grow past this, split behaviour into the declaration instead").toBeLessThan(250);
  });

  it("the generator stays small enough to read in one sitting", () => {
    const lines = readFileSync("scripts/generate.ts", "utf8").split("\n").length;
    expect(lines, "scripts/generate.ts has grown past the budget; every new emitter is its own reviewed change").toBeLessThan(500);
  });
});
