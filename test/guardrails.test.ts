import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { api } from "../src/resources/index.js";
import { flatten } from "../src/core/define.js";

describe("guardrails", () => {
  const services = () => readdirSync("src/resources", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const declarationFiles = (service: string) => readdirSync(`src/resources/${service}`).filter((f) => f.endsWith(".ts") && f !== "index.ts");

  it("every service folder is registered in src/resources/index.ts", () => {
    const registry = readFileSync("src/resources/index.ts", "utf8");
    const unregistered = services().filter((s) => !registry.includes(`./${s}/index.js`));
    expect(unregistered, "these folders exist but the registry does not import them, so they generate nothing. Add `import * as <service> from \"./<service>/index.js\"` and spread its entities and resources, or run `npm run new` next time").toEqual([]);
  });

  it("every exported resource is in api.resources", async () => {
    const missing: string[] = [];
    for (const s of services())
      for (const f of declarationFiles(s)) {
        const mod = (await import(/* @vite-ignore */ `../src/resources/${s}/${f.replace(/\.ts$/, ".js")}`)) as Record<string, unknown>;
        for (const [name, v] of Object.entries(mod)) {
          const isResource = typeof v === "object" && v !== null && "singular" in v && "instance" in v;
          if (isResource && !Object.values(api.resources).includes(v as never)) missing.push(`${s}/${f}: ${name}`);
        }
      }
    expect(missing, "exported with resource() but not listed under `resources` in its service's index.ts, so bt.<name> does not exist").toEqual([]);
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
