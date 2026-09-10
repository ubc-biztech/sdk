/**
 * Guardrails for people who do not understand this repo (which is everyone, soon).
 * Each test encodes one mistake that is easy to make with a wrong mental model, and
 * fails with a message that says what to do.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ontology } from "../src/ontology/index.js";
import { flatten } from "../src/ontology/dsl.js";

describe("guardrails", () => {
  it("every file in src/ontology/entities/ is registered in src/ontology/index.ts", () => {
    const index = readFileSync("src/ontology/index.ts", "utf8");
    const unregistered = readdirSync("src/ontology/entities").filter((f) => f.endsWith(".ts") && !index.includes(`./entities/${f.replace(/\.ts$/, ".js")}`));
    expect(unregistered, "these files exist but nothing imports them, so they generate nothing. Add an import and register their exports in src/ontology/index.ts, or run `npm run new` next time").toEqual([]);
  });

  it("every exported resource is in the ontology's resources", async () => {
    const missing: string[] = [];
    for (const f of readdirSync("src/ontology/entities").filter((f) => f.endsWith(".ts"))) {
      const mod = (await import(`../src/ontology/entities/${f.replace(/\.ts$/, ".js")}`)) as Record<string, unknown>;
      for (const [name, v] of Object.entries(mod)) {
        const isResource = typeof v === "object" && v !== null && "singular" in v && "instance" in v;
        if (isResource && !Object.values(ontology.resources).includes(v as never)) missing.push(`${f}: ${name}`);
      }
    }
    expect(missing, "exported with resource() but not listed under `resources` in src/ontology/index.ts, so bt.<name> does not exist").toEqual([]);
  });

  it("every generated method is self-describing (JSDoc names its auth and route)", () => {
    const client = readFileSync("src/client/generated/client.ts", "utf8");
    for (const a of flatten(ontology)) {
      const method = new RegExp(`\\n\\s+\\*/\\n\\s+${a.name.replace(/[$]/g, "\\$&")}: \\(`);
      const idx = client.search(method);
      expect(idx, `${a.key}: generated method has no JSDoc; the generator's actionDoc() is broken`).toBeGreaterThan(-1);
      const doc = client.slice(Math.max(0, idx - 800), idx);
      expect(doc, `${a.key}: JSDoc must state Auth:`).toMatch(/Auth: `\w+`/);
      expect(doc, `${a.key}: JSDoc must state Route:`).toMatch(/Route: `(GET|POST|PUT|PATCH|DELETE) \//);
    }
  });

  it("no action declares an error status the runtime cannot map (must be an HTTP status the backend can send)", () => {
    for (const a of flatten(ontology)) for (const [en, e] of Object.entries(a.spec.errors)) expect(e.status, `${a.key}.${en}`).toBeGreaterThanOrEqual(400);
  });

  it("the hand-written runtime stays small enough to read in one sitting", () => {
    const lines = readFileSync("src/client/runtime.ts", "utf8").split("\n").length;
    expect(lines, "src/client/runtime.ts is the only HTTP code; if it needs to grow past this, split behaviour into the declaration instead").toBeLessThan(250);
  });

  it("the generator stays small enough to read in one sitting", () => {
    const lines = ["emit.ts", "fields.ts", "index.ts"].reduce((n, f) => n + readFileSync(`src/gen/${f}`, "utf8").split("\n").length, 0);
    expect(lines, "src/gen/ has grown past the budget; every new emitter is its own reviewed change").toBeLessThan(500);
  });
});
