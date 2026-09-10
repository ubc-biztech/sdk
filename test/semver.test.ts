import { describe, expect, it } from "vitest";
import { classify } from "../src/check/semver.js";
import { ontology } from "../src/ontology/index.js";
import type { Ontology } from "../src/ontology/dsl.js";

const clone = (): Ontology => JSON.parse(JSON.stringify(ontology));

describe("semver classification", () => {
  it("identical → none", () => expect(classify(ontology, clone()).bump).toBe("none"));

  it("adding an optional field, action, link, role or resource → minor", () => {
    const n = clone();
    n.entities.Event!.fields.venueMapUrl = { kind: "string", optional: true, description: "x" };
    n.roles.exec = { description: "x" };
    n.resources.event!.instance.archive = { ...n.resources.event!.instance.get!, description: "x" };
    n.resources.team!.links.event = { description: "x", via: "event.get", map: { id: "id" } };
    n.resources.widget = { singular: "widget", description: "x", key: {}, collection: {}, instance: {}, links: {} };
    expect(classify(ontology, n).bump).toBe("minor");
  });

  it("breaking changes → major", () => {
    for (const mutate of [
      (n: Ontology) => delete n.entities.Event!.fields.ename,
      (n: Ontology) => (n.resources.event!.collection.list!.auth = "admin"),
      (n: Ontology) => (n.entities.Event!.fields.startDate!.optional = true),
      (n: Ontology) => (n.resources.event!.instance.get!.route.path = "/event/{id}/{year}"),
      (n: Ontology) => (n.resources.registration!.collection.list!.input!.email!.optional = false),
      (n: Ontology) => delete n.resources.event!.links.teams,
      (n: Ontology) => (n.resources.event!.key = { slug: { kind: "string", description: "x" } }),
      (n: Ontology) => delete n.resources.judgingRound,
      (n: Ontology) => delete n.resources.event!.instance.get!.errors.EventNotFound,
    ]) {
      const n = clone();
      mutate(n);
      expect(classify(ontology, n).bump).toBe("major");
    }
  });

  it("tightening an output or loosening an input → minor", () => {
    const n = clone();
    n.entities.Event!.fields.description!.optional = false;
    n.resources.registration!.collection.list!.input!.year!.optional = true;
    expect(classify(ontology, n).bump).toBe("minor");
  });
});
