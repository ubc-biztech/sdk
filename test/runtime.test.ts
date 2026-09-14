import { describe, expect, it } from "vitest";
import { createClient, ApiError, NotAuthenticatedError, InputError, ContractViolationError, EventNotFoundError, UnknownCodeError, ForbiddenError, PhaseClosedError } from "../src/index.js";

type Call = { url: string; init: RequestInit };
function fake(status: number, body: unknown) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { calls, fetch: f };
}
const headers = (c: Call) => c.init.headers as Record<string, string>;

const settings = { eventName: "HelloHacks 2027", phase: "prelim" as const, finalsTeamIds: [], finalsJudgeIds: [], showTeamFeedback: true, allowJudgeSeeOthers: true, anonymizeTeams: false, lockSubmissions: false, maxImages: 10 };
const doc = { updatedAt: "2026-09-13T00:00:00.000Z", settings, rubric: null, links: [], judges: [{ id: "j1", name: "Ada" }], teams: [{ id: "t1", name: "Team", members: ["a"] }] };
const review = { id: "prelim__t1__j1", round: "prelim", teamId: "t1", judgeId: "j1", judgeName: "Ada", scores: { design: 4 }, feedback: "", total: 4, weightedTotal: 4, completedAt: "2026-09-13T00:00:00.000Z" };

describe("credentials", () => {
  it("public actions send no credential, even when a code and a token are available", async () => {
    const { calls, fetch } = fake(200, { settings: { eventName: "HH", phase: "prelim" }, links: [] });
    const r = await createClient({ baseUrl: "https://x", fetch, getCode: () => "AAAA-BBBB", getToken: () => "jwt" }).judging("hellohacks", 2027).info();
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027");
    expect(headers(calls[0]!)["X-Judging-Code"]).toBeUndefined();
    expect(headers(calls[0]!)["Authorization"]).toBeUndefined();
    expect(r.settings.phase).toBe("prelim");
  });

  it("code actions send X-Judging-Code and never the token", async () => {
    const { calls, fetch } = fake(200, { me: { role: "judge", id: "j1", name: "Ada" }, ...doc });
    const r = await createClient({ baseUrl: "https://x", fetch, getCode: async () => "AAAA-BBBB", getToken: () => "jwt" }).judging("hellohacks", 2027).get();
    expect(headers(calls[0]!)["X-Judging-Code"]).toBe("AAAA-BBBB");
    expect(headers(calls[0]!)["Authorization"]).toBeUndefined();
    expect(r.me?.role).toBe("judge");
  });

  it("token actions send the bearer token and never the code", async () => {
    const { calls, fetch } = fake(200, doc);
    await createClient({ baseUrl: "https://x", fetch, getCode: () => "AAAA-BBBB", getToken: async () => "jwt" }).judging("hellohacks", 2027).admin.get();
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/admin");
    expect(headers(calls[0]!)["Authorization"]).toBe("Bearer jwt");
    expect(headers(calls[0]!)["X-Judging-Code"]).toBeUndefined();
  });

  it("refuses a code action without a code, and a token action without a token, before any HTTP", async () => {
    const { calls, fetch } = fake(200, doc);
    const j = createClient({ baseUrl: "https://x", fetch, getToken: () => "jwt" }).judging("hellohacks", 2027);
    await expect(j.get()).rejects.toBeInstanceOf(NotAuthenticatedError);
    const err = await createClient({ baseUrl: "https://x", fetch, getCode: () => "AAAA-BBBB" }).judging("hellohacks", 2027).admin.get().catch((e) => e);
    expect(err).toBeInstanceOf(NotAuthenticatedError);
    expect(err.message).toContain("getToken");
    expect(calls).toHaveLength(0);
  });
});

describe("chained client", () => {
  it("scope key + resource key + input compose; key fields are path params, the rest is the body", async () => {
    const { calls, fetch } = fake(200, { id: "t1", name: "n", members: [] });
    await createClient({ baseUrl: "https://x", fetch, getCode: () => "c" }).judging("hello hacks", 2027).team("t1").update({ name: "n", members: [] });
    expect(calls[0]!.url).toBe("https://x/judging/hello%20hacks/2027/teams/t1");
    expect(calls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ name: "n", members: [] });
  });

  it("a review goes to PUT /reviews/{teamId} with only scores and feedback in the body", async () => {
    const { calls, fetch } = fake(200, review);
    const r = await createClient({ baseUrl: "https://x", fetch, getCode: () => "c" }).judging("hellohacks", 2027).team("t1").review({ scores: { design: 4 }, feedback: "nice" });
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/reviews/t1");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ scores: { design: 4 }, feedback: "nice" });
    expect(r.total).toBe(4);
  });

  it("collection filters become query params and undefined ones are omitted", async () => {
    const { calls, fetch } = fake(200, []);
    const j = createClient({ baseUrl: "https://x", fetch, getCode: () => "c", getToken: () => "t" }).judging("hellohacks", 2027);
    await j.reviews.list();
    await j.reviews.list({ round: "prelim", judgeId: "j1" });
    await j.admin.reviews({ teamId: "t1" });
    expect(calls.map((c) => c.url)).toEqual(["https://x/judging/hellohacks/2027/reviews", "https://x/judging/hellohacks/2027/reviews?round=prelim&judgeId=j1", "https://x/judging/hellohacks/2027/admin/reviews?teamId=t1"]);
    expect(calls.every((c) => c.init.body === undefined)).toBe(true);
  });

  it("links resolve with one call to the declared action, mapping scope and key fields", async () => {
    const { calls, fetch } = fake(200, []);
    await createClient({ baseUrl: "https://x", fetch, getCode: () => "c" }).judging("hellohacks", 2027).team("t1").reviews();
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027/reviews?teamId=t1");
  });

  it("admin.set sends the whole document and returns it with codes", async () => {
    const withCodes = { ...doc, judges: [{ id: "j1", name: "Ada", code: "AAAA-BBBB" }], teams: [{ id: "t1", name: "Team", members: ["a"], code: "CCCC-DDDD" }] };
    const { calls, fetch } = fake(200, withCodes);
    const r = await createClient({ baseUrl: "https://x", fetch, getToken: () => "jwt" }).judging("hellohacks", 2027).admin.set({ settings, rubric: null, links: [], judges: [{ name: "Ada" }], teams: [{ id: "t1", name: "Team", members: ["a"] }] });
    expect(calls[0]!.url).toBe("https://x/judging/hellohacks/2027");
    expect(calls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(calls[0]!.init.body as string).judges).toEqual([{ name: "Ada" }]);
    expect(r.judges[0]!.code).toBe("AAAA-BBBB");
  });
});

describe("errors", () => {
  it("maps a declared status to its semantic error, and undeclared to ApiError", async () => {
    const j = (status: number, body: unknown, cfg: Record<string, unknown> = {}) => createClient({ baseUrl: "https://x", fetch: fake(status, body).fetch, getCode: () => "c", getToken: () => "t", ...cfg }).judging("hellohacks", 2027);
    await expect(j(404, { message: "not found" }).info()).rejects.toBeInstanceOf(EventNotFoundError);
    await expect(j(401, { message: "Code not recognized" }).get()).rejects.toBeInstanceOf(UnknownCodeError);
    await expect(j(403, { message: "Admin access required" }).admin.get()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(j(409, { message: "Judging is not open" }).team("t1").review({ scores: {} })).rejects.toBeInstanceOf(PhaseClosedError);
    const err = await j(500, { message: "boom" }).info().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toContain("boom");
  });

  it("rejects bad input before sending", async () => {
    const { calls, fetch } = fake(200, doc);
    await expect(createClient({ baseUrl: "https://x", fetch }).judging("hellohacks", "2027" as unknown as number).info()).rejects.toBeInstanceOf(InputError);
    await expect(createClient({ baseUrl: "https://x", fetch, getCode: () => "c" }).judging("hellohacks", 2027).team("t1").update({ name: "n" } as never)).rejects.toBeInstanceOf(InputError);
    expect(calls).toHaveLength(0);
  });

  it("throws ContractViolationError when the response disagrees with the declaration, unless validation is off", async () => {
    await expect(createClient({ baseUrl: "https://x", fetch: fake(200, { settings: {} }).fetch }).judging("hellohacks", 2027).info()).rejects.toBeInstanceOf(ContractViolationError);
    await expect(createClient({ baseUrl: "https://x", fetch: fake(200, { settings: {} }).fetch, validateOutput: false }).judging("hellohacks", 2027).info()).resolves.toEqual({ settings: {} });
  });

  it("strips undeclared fields so the declaration is the contract, and accepts nullable and optional ones", async () => {
    const r = await createClient({ baseUrl: "https://x", fetch: fake(200, { ...doc, secret: 1 }).fetch, getToken: () => "t" }).judging("hellohacks", 2027).admin.get();
    expect("secret" in r).toBe(false);
    expect(r.rubric).toBeNull();
    expect(r.me).toBeUndefined();
  });
});
