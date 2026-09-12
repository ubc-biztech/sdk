import { describe, expect, it } from "vitest";
import { classify } from "../src/semver.js";
import { api } from "../src/api.js";
import type { Api } from "../src/define.js";

const clone = (): Api => JSON.parse(JSON.stringify(api));

describe("semver classification", () => {
  it("identical → none", () => expect(classify(api, clone()).bump).toBe("none"));

  it("adding an optional field, action, link, role or resource → minor", () => {
    const n = clone();
    n.entities.Event!.fields.venueMapUrl = { kind: "string", optional: true, description: "x" };
    n.roles.exec = { description: "x" };
    n.resources.event!.instance.archive = { ...n.resources.event!.instance.get!, description: "x" };
    n.resources.team!.links.event = { description: "x", via: "event.get", map: { id: "id" } };
    n.resources.widget = { singular: "widget", description: "x", key: {}, collection: {}, instance: {}, links: {} };
    expect(classify(api, n).bump).toBe("minor");
  });

  it("breaking changes → major", () => {
    for (const mutate of [
      (n: Api) => delete n.entities.Event!.fields.ename,
      (n: Api) => (n.resources.event!.collection.list!.auth = "admin"),
      (n: Api) => (n.entities.Event!.fields.startDate!.optional = true),
      (n: Api) => (n.resources.event!.instance.get!.route.path = "/event/{id}/{year}"),
      (n: Api) => (n.resources.registration!.collection.list!.input!.email!.optional = false),
      (n: Api) => delete n.resources.event!.links.teams,
      (n: Api) => (n.resources.event!.key = { slug: { kind: "string", description: "x" } }),
      (n: Api) => delete n.resources.judgingRound,
      (n: Api) => delete n.resources.event!.instance.get!.errors.EventNotFound,
    ]) {
      const n = clone();
      mutate(n);
      expect(classify(api, n).bump).toBe("major");
    }
  });

  it("tightening an output or loosening an input → minor", () => {
    const n = clone();
    n.entities.Event!.fields.description!.optional = false;
    n.resources.registration!.collection.list!.input!.year!.optional = true;
    expect(classify(api, n).bump).toBe("minor");
  });
});
