import { describe, expect, it } from "vitest";
import { classify } from "../src/semver.js";
import { api } from "../src/api.js";
import type { Api } from "../src/define.js";

const clone = (): Api => JSON.parse(JSON.stringify(api));

describe("semver classification", () => {
  it("identical → none", () => expect(classify(api, clone()).bump).toBe("none"));

  it("adding an optional field, action, link, role or resource → minor", () => {
    const n = clone();
    n.entities.JudgingTeam!.fields.videoUrl = { kind: "string", optional: true, description: "x" };
    n.roles.exec = { credential: "token", description: "x" };
    n.resources.judging!.instance.archive = { ...n.resources.judging!.instance.info!, description: "x" };
    n.resources.judgingTeam!.links.event = { description: "x", via: "judging.info", map: { eventID: "eventID", year: "year" } };
    n.resources.widget = { singular: "widget", description: "x", key: {}, collection: {}, instance: {}, links: {} };
    expect(classify(api, n).bump).toBe("minor");
  });

  it("breaking changes → major", () => {
    for (const mutate of [
      (n: Api) => delete n.entities.Review!.fields.total,
      (n: Api) => (n.resources.judging!.instance.info!.auth = "admin"),
      (n: Api) => (n.entities.JudgingTeam!.fields.name!.optional = true),
      (n: Api) => (n.resources.judging!.instance.get!.route.path = "/judging/{eventID}/{year}/me"),
      (n: Api) => (n.resources.review!.collection.list!.input!.round!.optional = false),
      (n: Api) => delete n.resources.judgingTeam!.links.reviews,
      (n: Api) => (n.resources.judgingTeam!.key = { slug: { kind: "string", description: "x" } }),
      (n: Api) => delete n.resources.judgingAdmin,
      (n: Api) => delete n.resources.judging!.instance.info!.errors.EventNotFound,
      (n: Api) => delete n.roles.admin,
    ]) {
      const n = clone();
      mutate(n);
      expect(classify(api, n).bump).toBe("major");
    }
  });

  it("tightening an output or loosening an input → minor", () => {
    const n = clone();
    n.entities.JudgingTeam!.fields.description!.optional = false;
    n.resources.judgingTeam!.instance.update!.input!.members!.optional = true;
    expect(classify(api, n).bump).toBe("minor");
  });
});
