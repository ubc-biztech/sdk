import { describe, expect, it } from "vitest";
import { createHandler, ActionError, type Impl } from "../src/server/generated/judging.js";

const settings = { eventName: "HH", phase: "prelim" as const, perTeamJudges: 2, finalsTopN: 5, finalsTeamIds: [], finalsJudgeIds: [], showTeamFeedback: false, allowJudgeSeeOthers: true, anonymizeTeams: false, lockSubmissions: false, maxImages: 10, updatedAt: "t" };
const team = { id: "t1", name: "Alpha", members: ["a"], imageUrls: [], createdAt: "t" };

// A stub: only what the tests exercise. The real impl lives in serverless-biztechapp/services/judging.
const impl: Partial<Impl> & Pick<Impl, "authenticate"> = {
  async authenticate(token: string) {
    return token === "admin" ? { role: "judgingAdmin", id: "admin", name: "Org" } : token === "judge" ? { role: "judge", id: "j1", name: "J" } : token === "team" ? { role: "judgingCode", id: "t1", name: "Alpha" } : null;
  },
  async settingsGet(ctx, input) {
    if (input.eventID === "nope") throw new ActionError("EventNotFound", "no such event");
    return { ...settings, eventName: `${input.eventID} ${input.year}` };
  },
  async teamsList() {
    return [team];
  },
  async teamGet(ctx, input) {
    if (input.id === "bad-output") return { id: 1 } as never;
    if (input.id === "boom") throw new Error("db down");
    if (input.id === "undeclared") throw new ActionError("Nope", "not declared here");
    return { ...team, id: input.id, code: ctx.principal?.role === "judgingAdmin" ? "SECRET" : undefined };
  },
  async reviewsList(ctx, input) {
    return [{ id: "r", round: input.round ?? "prelim", teamId: input.teamId ?? "t1", judgeId: "j1", judgeName: "J", scores: { a: 1 }, feedback: "", total: 1, weightedTotal: 1, completedAt: "t" }];
  },
  async teamsCreate(ctx, input) {
    return { ...team, name: input.name, members: input.members };
  },
};

const handler = createHandler(impl as Impl, () => {});
const call = (method: string, path: string, opts: { token?: string; body?: unknown; query?: Record<string, string> } = {}) =>
  handler({ httpMethod: method, path, headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : {}, body: opts.body ? JSON.stringify(opts.body) : null, queryStringParameters: opts.query ?? null, requestContext: { requestId: "req" } });
const json = (r: { body: string }) => JSON.parse(r.body);

describe("generated server router", () => {
  it("routes and coerces scope params by declared kind", async () => {
    const r = await call("GET", "/judging/hellohacks/2027/settings");
    expect(r.statusCode).toBe(200);
    expect(json(r).eventName).toBe("hellohacks 2027");
  });

  it("404 for unknown path, 405 for known path with wrong method", async () => {
    expect((await call("GET", "/judging/hellohacks/2027/nothing")).statusCode).toBe(404);
    expect((await call("DELETE", "/judging/hellohacks/2027/settings")).statusCode).toBe(405);
  });

  it("401 without a token on non-public, 401 for unknown token, 403 for insufficient role", async () => {
    expect((await call("GET", "/judging/hellohacks/2027/teams")).statusCode).toBe(401);
    expect((await call("GET", "/judging/hellohacks/2027/teams", { token: "garbage" })).statusCode).toBe(401);
    expect((await call("POST", "/judging/hellohacks/2027/teams", { token: "judge", body: { name: "x", members: [] } })).statusCode).toBe(403);
  });

  it("role implication: admin satisfies judge and judgingCode", async () => {
    expect((await call("GET", "/judging/hellohacks/2027/teams", { token: "admin" })).statusCode).toBe(200);
    expect((await call("GET", "/judging/hellohacks/2027/teams", { token: "team" })).statusCode).toBe(200);
    expect((await call("POST", "/judging/hellohacks/2027/teams", { token: "admin", body: { name: "x", members: [] } })).statusCode).toBe(200);
  });

  it("400 on invalid input, with issues", async () => {
    const r = await call("POST", "/judging/hellohacks/2027/teams", { token: "admin", body: { name: 5 } });
    expect(r.statusCode).toBe(400);
    expect(json(r).issues.length).toBeGreaterThan(0);
    expect((await call("GET", "/judging/hellohacks/notayear/settings")).statusCode).toBe(400);
  });

  it("query params are coerced and passed; principal is available to the impl", async () => {
    const r = await call("GET", "/judging/hellohacks/2027/reviews", { token: "judge", query: { teamId: "t9", round: "finals" } });
    expect(json(r)[0]).toMatchObject({ teamId: "t9", round: "finals" });
    expect(json(await call("GET", "/judging/hellohacks/2027/teams/t1", { token: "admin" })).code).toBe("SECRET");
    expect(json(await call("GET", "/judging/hellohacks/2027/teams/t1", { token: "judge" })).code).toBeUndefined();
  });

  it("declared ActionError → declared status; undeclared name or plain throw → 500", async () => {
    const r = await call("GET", "/judging/nope/2027/settings");
    expect(r.statusCode).toBe(404);
    expect(json(r).error).toBe("EventNotFound");
    expect((await call("GET", "/judging/hellohacks/2027/teams/undeclared", { token: "judge" })).statusCode).toBe(500);
    expect((await call("GET", "/judging/hellohacks/2027/teams/boom", { token: "judge" })).statusCode).toBe(500);
  });

  it("output that violates the declaration is a 500, never sent", async () => {
    const r = await call("GET", "/judging/hellohacks/2027/teams/bad-output", { token: "judge" });
    expect(r.statusCode).toBe(500);
    expect(json(r).message).toMatch(/does not match the declaration/);
  });

  it("501 for a declared action the impl does not implement", async () => {
    expect((await call("GET", "/judging/hellohacks/2027/rubric", { token: "judge" })).statusCode).toBe(501);
  });

  it("OPTIONS preflight is answered without auth", async () => {
    expect((await call("OPTIONS", "/judging/hellohacks/2027/teams")).statusCode).toBe(204);
  });
});

describe("class-based impl", () => {
  it("methods are invoked with `this` bound to the impl", async () => {
    class Impl2 {
      private readonly name = "HH";
      async authenticate() { return null; }
      async settingsGet() { return { ...settings, eventName: this.name }; }
    }
    const h = createHandler(new Impl2() as unknown as Impl, () => {});
    const r = await h({ httpMethod: "GET", path: "/judging/x/2027/settings", headers: {}, requestContext: { requestId: "r" } });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).eventName).toBe("HH");
  });
});

describe("per-endpoint handlers (explicit routes)", () => {
  it("reads path params from event.pathParameters and behaves like the router", async () => {
    const { createHandlers } = await import("../src/server/generated/judging.js");
    const h = createHandlers(impl as Impl, () => {});
    const r = await h.settingsGet({ httpMethod: "GET", path: "/judging/hellohacks/2027/settings", pathParameters: { eventID: "hellohacks", year: "2027" }, headers: {}, requestContext: { requestId: "r" } });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).eventName).toBe("hellohacks 2027");
    expect(r.headers["Access-Control-Allow-Credentials"]).toBe("true");
    const denied = await h.teamsList({ httpMethod: "GET", path: "/judging/hellohacks/2027/teams", pathParameters: { eventID: "hellohacks", year: "2027" }, headers: {}, requestContext: { requestId: "r" } });
    expect(denied.statusCode).toBe(401);
  });
});
