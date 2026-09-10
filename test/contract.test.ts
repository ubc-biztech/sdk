/**
 * Contract tests: the declaration *claims* what existing handlers return; these prove it
 * against api-dev. Only public, read-only actions run without credentials. Set
 * BT_ID_TOKEN to a dev-pool ID token to exercise authenticated ones. Nothing here writes.
 *
 * Skipped unless BT_CONTRACT=1, because it needs the network.
 */
import { describe, expect, it } from "vitest";
import { createClient, ApiError, EventNotFoundError, NotAuthenticatedError, EventSchema } from "../src/client/index.js";
import knownDrift from "./known-drift.json" with { type: "json" };

const enabled = process.env.BT_CONTRACT === "1";
const token = process.env.BT_ID_TOKEN;
const baseUrl = process.env.BT_API_URL ?? "https://api-dev.ubcbiztech.com";
const bt = createClient({ baseUrl, getToken: () => token ?? null });

describe.skipIf(!enabled)("contract: api-dev", () => {
  it("events.list: every row matches Event, except rows listed in known-drift.json", async () => {
    const raw = createClient({ baseUrl, validateOutput: false });
    const rows = (await raw.events.list()) as Array<{ id: string; year: number }>;
    expect(rows.length).toBeGreaterThan(0);
    const violations = rows
      .map((r) => ({ r, parsed: EventSchema.safeParse(r) }))
      .filter((x) => !x.parsed.success)
      .map((x) => ({ id: x.r.id, year: x.r.year, issues: x.parsed.error!.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }));
    const allowed = new Set(knownDrift["events.list"].map((k) => `${k.id}/${k.year}`));
    const unexpected = violations.filter((v) => !allowed.has(`${v.id}/${v.year}`));
    expect(unexpected, "new drift between the Event declaration and api-dev").toEqual([]);
    const stillBad = new Set(violations.map((v) => `${v.id}/${v.year}`));
    const stale = [...allowed].filter((k) => !stillBad.has(k));
    expect(stale, "known-drift.json entries that no longer violate; remove them").toEqual([]);
  });

  it("events.list?id= filters", async () => {
    const events = await bt.events.list({ id: "blueprint" });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.id === "blueprint")).toBe(true);
  });

  it("event(id, year).get returns the full record", async () => {
    const e = await bt.event("blueprint", 2026).get();
    expect(e.ename).toBeTypeOf("string");
    expect(Array.isArray(e.registrationQuestions)).toBe(true);
  });

  it("event(...).get on a missing event throws EventNotFoundError", async () => {
    await expect(bt.event("does-not-exist", 1999).get()).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it("event(...).counts returns tallies", async () => {
    const c = await bt.event("blueprint", 2026).counts();
    expect(c.registeredCount).toBeTypeOf("number");
  });

  it("judgingRound.get returns a string round", async () => {
    const r = await bt.judgingRound.get();
    expect(r.round).toBeTypeOf("string");
  });

  it("teams.scores matches NormalizedTeamScore and teamID carries the ;round suffix", async () => {
    const scores = await bt.teams.scores();
    expect(Array.isArray(scores)).toBe(true);
    for (const s of scores) expect(s.teamID).toContain(";");
  });

  it("team(unknown).feedback surfaces the backend's 500-for-not-found as ApiError (documented bug)", async () => {
    const err = await bt.team("does-not-exist").feedback().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect([500, 502]).toContain(err.status);
  });

  it.skipIf(!!token)("registrations.list refuses without a token", async () => {
    await expect(bt.registrations.list({ eventID: "blueprint", year: 2026 })).rejects.toBeInstanceOf(NotAuthenticatedError);
  });

  it.skipIf(!token)("me.get returns the caller", async () => {
    const me = await bt.me.get();
    expect(me.id).toContain("@");
  });

  it.skipIf(!token)("event(...).registrations and .teams resolve", async () => {
    expect(Array.isArray(await bt.event("blueprint", 2026).registrations())).toBe(true);
    expect(Array.isArray(await bt.event("blueprint", 2026).teams())).toBe(true);
  });
});
