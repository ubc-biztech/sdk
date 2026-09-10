import { describe, expect, it } from "vitest";
import { createClient, EventNotFoundError, ApiError, NotAuthenticatedError, InputError, ContractViolationError } from "../src/client/index.js";

type Call = { url: string; init: RequestInit };
function fake(status: number, body: unknown) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { calls, fetch: f };
}
const event = { id: "blueprint", year: 2026, ename: "Blueprint", startDate: "s", endDate: "e", capac: 1, isPublished: true, createdAt: 1 };

describe("chained client", () => {
  it("instance key becomes path params, URL-encoded", async () => {
    const { calls, fetch } = fake(200, event);
    const bt = createClient({ baseUrl: "https://x", fetch });
    await bt.event("blue print", 2026).get();
    expect(calls[0]!.url).toBe("https://x/events/blue%20print/2026");
    expect(calls[0]!.init.method).toBe("GET");
    expect(calls[0]!.init.body).toBeUndefined();
  });

  it("collection actions send declared query fields and omit undefined", async () => {
    const { calls, fetch } = fake(200, []);
    const bt = createClient({ baseUrl: "https://x", fetch });
    await bt.events.list();
    await bt.events.list({ id: "blueprint" });
    expect(calls.map((c) => c.url)).toEqual(["https://x/events", "https://x/events?id=blueprint"]);
  });

  it("fixedQuery is appended", async () => {
    const { calls, fetch } = fake(200, { registeredCount: 1, checkedInCount: 0, waitlistCount: 0 });
    await createClient({ baseUrl: "https://x", fetch }).event("a", 2026).counts();
    expect(calls[0]!.url).toBe("https://x/events/a/2026?count=true");
  });

  it("instance action with input merges key into the body, and path params are not repeated in the body", async () => {
    const { calls, fetch } = fake(200, { message: "ok" });
    const bt = createClient({ baseUrl: "https://x", fetch });
    await bt.team("t1").assignJudges({ judgeIDs: ["j@x.com"] });
    expect(calls[0]!.url).toBe("https://x/team/judge/currentTeam/t1");
    expect(calls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ judgeIDs: ["j@x.com"] });
  });

  it("instance key that is not a path param goes into the body", async () => {
    const { calls, fetch } = fake(200, { message: "ok" });
    const bt = createClient({ baseUrl: "https://x", fetch });
    await bt.legacyJudge("j@x.com").submit({ teamID: "t1", eventID: "hh", year: 2026, scores: { metric1: 1, metric2: 2, metric3: 3, metric4: 4, metric5: 5 } });
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.judgeID).toBe("j@x.com");
    expect(body.teamID).toBe("t1");
  });

  it("singleton resources are objects, not functions", async () => {
    const { calls, fetch } = fake(200, { round: "2" });
    const bt = createClient({ baseUrl: "https://x", fetch });
    const r = await bt.judgingRound.get();
    expect(r.round).toBe("2");
    await createClient({ baseUrl: "https://x", fetch: fake(200, { message: "ok" }).fetch }).judgingRound.set({ round: "3" });
    expect(calls[0]!.url).toBe("https://x/team/round");
  });

  it("links resolve with one call to the declared action, mapping the key", async () => {
    const { calls, fetch } = fake(200, []);
    const bt = createClient({ baseUrl: "https://x", fetch, getToken: () => "tok" });
    await bt.event("blueprint", 2026).registrations();
    await bt.event("blueprint", 2026).teams();
    expect(calls.map((c) => c.url)).toEqual(["https://x/registrations?eventID=blueprint&year=2026", "https://x/team/blueprint/2026"]);
  });

  it("maps a declared status to its semantic error, and undeclared to ApiError", async () => {
    const bt = createClient({ baseUrl: "https://x", fetch: fake(404, { message: "nope" }).fetch });
    await expect(bt.event("a", 1).get()).rejects.toBeInstanceOf(EventNotFoundError);
    const err = await createClient({ baseUrl: "https://x", fetch: fake(500, { message: "boom" }).fetch }).event("a", 1).get().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toContain("boom");
  });

  it("refuses non-public actions without a token, before any HTTP", async () => {
    const { calls, fetch } = fake(200, []);
    await expect(createClient({ baseUrl: "https://x", fetch }).registrations.list({ email: "a@b.c" })).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(calls).toHaveLength(0);
  });

  it("attaches the bearer token when available", async () => {
    const { calls, fetch } = fake(200, { id: "a@b.c" });
    await createClient({ baseUrl: "https://x", fetch, getToken: async () => "tok" }).me.get();
    expect((calls[0]!.init.headers as Record<string, string>)["Authorization"]).toBe("Bearer tok");
    expect(calls[0]!.url).toBe("https://x/users/self");
  });

  it("rejects bad input before sending", async () => {
    const { calls, fetch } = fake(200, event);
    await expect(createClient({ baseUrl: "https://x", fetch }).event("a", "2026" as unknown as number).get()).rejects.toBeInstanceOf(InputError);
    expect(calls).toHaveLength(0);
  });

  it("throws ContractViolationError when the response disagrees with the declaration, unless validation is off", async () => {
    await expect(createClient({ baseUrl: "https://x", fetch: fake(200, { id: "a" }).fetch }).event("a", 1).get()).rejects.toBeInstanceOf(ContractViolationError);
    await expect(createClient({ baseUrl: "https://x", fetch: fake(200, { id: "a" }).fetch, validateOutput: false }).event("a", 1).get()).resolves.toEqual({ id: "a" });
  });

  it("strips undeclared fields so the declaration is the contract", async () => {
    const e = await createClient({ baseUrl: "https://x", fetch: fake(200, { ...event, secret: 1 }).fetch }).event("a", 1).get();
    expect("secret" in e).toBe(false);
  });

  it("accepts nullable fields", async () => {
    const r = await createClient({ baseUrl: "https://x", fetch: fake(200, { message: "m", currentTeamID: "t", currentTeamName: null }).fetch }).legacyJudge("j").currentTeam();
    expect(r.currentTeamName).toBeNull();
  });
});

describe("scoped resources", () => {
  const ok = (body: unknown) => fake(200, body);
  it("scope key flows into path params of every nested action", async () => {
    const { calls, fetch } = ok({ eventName: "HH", phase: "prelim", perTeamJudges: 2, finalsTopN: 5, finalsTeamIds: [], finalsJudgeIds: [], showTeamFeedback: false, allowJudgeSeeOthers: true, anonymizeTeams: false, lockSubmissions: false, maxImages: 10, updatedAt: "t" });
    await createClient({ baseUrl: "https://x", fetch }).judging("hellohacks", 2027).settings.get();
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/settings");
  });
  it("scope key + resource key + input compose, with key fields kept out of the body", async () => {
    const team = { id: "t1", name: "n", members: [], imageUrls: [], createdAt: "t" };
    const { calls, fetch } = ok(team);
    await createClient({ baseUrl: "https://x", fetch, getToken: () => "code" }).judging("hellohacks", 2027).team("t1").update({ name: "n", members: [] });
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/teams/t1");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ name: "n", members: [] });
  });
  it("scoped links map scope and key fields onto the target's input", async () => {
    const { calls, fetch } = ok([]);
    await createClient({ baseUrl: "https://x", fetch, getToken: () => "code" }).judging("hellohacks", 2027).team("t1").reviews();
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/reviews?teamId=t1");
  });
  it("code roles require a token like any non-public action", async () => {
    const { calls, fetch } = ok([]);
    await expect(createClient({ baseUrl: "https://x", fetch }).judging("hellohacks", 2027).teams.list()).rejects.toBeInstanceOf(NotAuthenticatedError);
    expect(calls).toHaveLength(0);
  });
});
