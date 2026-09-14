/**
 * Contract tests: the declaration *claims* what the handlers return; these prove it against
 * api-dev. Without credentials only the public action runs. Set BT_JUDGING_CODE to a judge or
 * team code, and BT_ID_TOKEN to an exec's Cognito ID token, to exercise the rest. Nothing here
 * writes. BT_JUDGING_EVENT is `<slug>-<year>`, default `hellohacks-2027`.
 *
 * Skipped unless BT_CONTRACT=1, because it needs the network.
 */
import { describe, expect, it } from "vitest";
import { createClient, EventNotFoundError, UnknownCodeError, NotAuthenticatedError } from "../src/index.js";

const enabled = process.env.BT_CONTRACT === "1";
const code = process.env.BT_JUDGING_CODE;
const token = process.env.BT_ID_TOKEN;
const baseUrl = process.env.BT_API_URL ?? "https://api-dev.ubcbiztech.com";
const [, slug, year] = /^(.*)-(\d{4})$/.exec(process.env.BT_JUDGING_EVENT ?? "hellohacks-2027") ?? [, "hellohacks", "2027"];
const bt = createClient({ baseUrl, getCode: () => code ?? null, getToken: () => token ?? null });
const j = bt.judging(slug!, Number(year));

describe.skipIf(!enabled)("contract: api-dev", () => {
  it("judging.info matches JudgingInfo, or is a clean 404 when the event is not set up", async () => {
    const r = await j.info().catch((e) => e);
    if (r instanceof EventNotFoundError) return;
    expect(r.settings.eventName).toBeTypeOf("string");
    expect(["submission", "prelim", "finals", "closed"]).toContain(r.settings.phase);
  });

  it("judging.info on an event that does not exist throws EventNotFoundError", async () => {
    await expect(bt.judging("does-not-exist", 1999).info()).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it("judging.get with a made-up code throws UnknownCodeError", async () => {
    await expect(createClient({ baseUrl, getCode: () => "ZZZZ-ZZZZ" }).judging(slug!, Number(year)).get()).rejects.toBeInstanceOf(UnknownCodeError);
  });

  it.skipIf(!!code)("judging.get refuses without a code, before any HTTP", async () => {
    await expect(j.get()).rejects.toBeInstanceOf(NotAuthenticatedError);
  });

  it.skipIf(!code)("judging.get returns the document and me, without codes", async () => {
    const doc = await j.get();
    expect(doc.me?.role).toMatch(/^(judge|team)$/);
    expect(doc.judges.every((x) => x.code === undefined)).toBe(true);
    expect(doc.teams.every((x) => x.code === undefined)).toBe(true);
  });

  it.skipIf(!code)("reviews.list resolves for the code (or is 403 for a team before results are public)", async () => {
    const r = await j.reviews.list().catch((e) => e);
    if (!Array.isArray(r)) expect(r.name).toBe("ForbiddenError");
  });

  it.skipIf(!token)("admin.get returns every code, and admin.reviews resolves", async () => {
    const doc = await j.admin.get();
    expect(doc.me).toBeUndefined();
    expect(doc.judges.every((x) => typeof x.code === "string")).toBe(true);
    expect(Array.isArray(await j.admin.reviews())).toBe(true);
  });
});
