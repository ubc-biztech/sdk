import { describe, expect, it } from "vitest";
import { validate, flatten, type Api } from "../src/core/define.js";
import { api } from "../src/resources/index.js";

describe("api declaration", () => {
  it("is valid", () => expect(() => validate(api)).not.toThrow());

  it("has unique action keys and every link resolves to a declared action", () => {
    const keys = flatten(api).map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of Object.values(api.resources)) for (const l of Object.values(r.links)) expect(keys).toContain(l.via);
  });

  it("rejects an undeclared role, a path param that is not an input, a shadowed key, and an empty description", () => {
    const bad: Api = {
      roles: { public: { credential: "none", description: "x" } },
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
    const msg = (() => { try { validate(bad); return ""; } catch (e) { return String(e); } })();
    expect(msg).toMatch(/auth is "wizard" but the declared roles are "public"/);
    expect(msg).toMatch(/input field "id" is already provided by the chain \(id\)/);
    expect(msg).toMatch(/route\.path has \{nope\} but no field named "nope" exists\. Available: id/);
    expect(msg).toMatch(/output: description is empty\. Say what the value means/);
    expect(msg).toMatch(/Fix them in the files named/);
  });

  it("route paths are absolute and never end in a slash", () => {
    for (const a of flatten(api)) {
      expect(a.spec.route.path, a.key).toMatch(/^\//);
      expect(a.spec.route.path, a.key).not.toMatch(/\/$/);
    }
  });
});
