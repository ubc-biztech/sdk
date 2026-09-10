import { describe, expect, it } from "vitest";
import { validate, flatten, type Ontology } from "../src/ontology/dsl.js";
import { ontology } from "../src/ontology/index.js";

describe("ontology", () => {
  it("is valid", () => expect(() => validate(ontology)).not.toThrow());

  it("has unique action keys and every link resolves to a declared action", () => {
    const keys = flatten(ontology).map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of Object.values(ontology.resources)) for (const l of Object.values(r.links)) expect(keys).toContain(l.via);
  });

  it("rejects an undeclared role, a path param that is not an input, a shadowed key, and an empty description", () => {
    const bad: Ontology = {
      roles: { public: { description: "x" } },
      entities: {},
      resources: {
        thing: {
          singular: "thing", plural: "things", description: "d", key: { id: { kind: "string", description: "k" } },
          collection: {},
          instance: {
            a: { description: "d", auth: "wizard", output: { kind: "json", description: "" }, input: { id: { kind: "string", description: "dup" } }, errors: {}, route: { method: "GET", path: "/x/{nope}" } },
          },
          links: {},
        },
      },
    };
    expect(() => validate(bad)).toThrow(/auth "wizard".*\n.*shadows the resource key.*\n.*path param \{nope\}.*\n.*description is empty/s);
  });

  it("route paths are absolute and never end in a slash", () => {
    for (const a of flatten(ontology)) {
      expect(a.spec.route.path, a.key).toMatch(/^\//);
      expect(a.spec.route.path, a.key).not.toMatch(/\/$/);
    }
  });
});
