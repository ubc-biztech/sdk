// Served by serverless-biztechapp/services/teams/handlerJudging.ts. Judges and teams have no
// BizTech account: an organizer mints them a code, sent as X-Judging-Code. Organizers send a
// Cognito ID token, and the backend keeps their work on separate /admin routes.
import { resource, action, str, list, obj, ref } from "../../core/define.js";
import { JudgingEvent, JudgingInfo, JudgingLink, JudgingSettings, Rubric, judgeFields, teamFields } from "./entities.js";
import { reviewFilters, reviewsOutput } from "./reviews.js";
import { judgingScope, base, unknownCode, notAdmin } from "./shared.js";

export const judging = resource({
  singular: "judging",
  scope: judgingScope,
  entity: JudgingEvent,
  description: "The event's judging as one document. `bt.judging(e, y).info()` before login, `.get()` with a code (which is also login).",
  instance: {
    info: action({
      description: "Event name, phase and links, for the landing page before anyone logs in. Sends no credential.",
      auth: "public",
      output: ref(JudgingInfo, { description: "Name, phase, links." }),
      errors: { EventNotFound: { status: 404, description: "No judging has been set up for this event. `admin.set` creates it." } },
      route: { method: "GET", path: base },
    }),
    get: action({
      description: "The whole document as the code may see it, plus `me`. Judge and team codes are never included. This is also login: send the code and a 401 means it is not recognized.",
      auth: "judgingCode",
      output: ref(JudgingEvent, { description: "The document, with `me`." }),
      errors: unknownCode,
      route: { method: "GET", path: base },
    }),
  },
});

export const judgingAdmin = resource({
  singular: "admin",
  scope: judgingScope,
  entity: JudgingEvent,
  description: "Organizer actions, with a Cognito token. `bt.judging(e, y).admin.get()` reads the document with every code, `.set()` replaces it, `.reviews()` lists every review.",
  instance: {
    get: action({
      description: "The whole document including every judge and team code. No `me`.",
      auth: "admin",
      output: ref(JudgingEvent, { description: "The document with every code." }),
      errors: { EventNotFound: { status: 404, description: "No judging has been set up for this event yet. `set` creates it." }, ...notAdmin },
      route: { method: "GET", path: `${base}/admin` },
    }),
    set: action({
      description: "Replace the whole document, creating it if needed. Judges and teams without an `id` or `code` get one minted; pass existing ones back to keep them. The response includes every code. Last write wins.",
      auth: "admin",
      input: {
        settings: ref(JudgingSettings, { description: "Phase and switches." }),
        rubric: ref(Rubric, { optional: true, nullable: true, description: "The rubric. Omit or null for none." }),
        links: list(ref(JudgingLink, { description: "A link." }), { description: "Home-page links." }),
        judges: list(obj({ id: str({ optional: true, description: "Keep an existing judge's id; omit for a new one." }), ...judgeFields, code: str({ optional: true, description: "Keep an existing judge's code; omit to mint one." }) }, { description: "A judge." }), { description: "Every judge." }),
        teams: list(obj({ id: str({ optional: true, description: "Keep an existing team's id; omit for a new one." }), ...teamFields, code: str({ optional: true, description: "Keep an existing team's code; omit to mint one." }) }, { description: "A team." }), { description: "Every team." }),
      },
      output: ref(JudgingEvent, { description: "The stored document with every code." }),
      errors: { InvalidInput: { status: 406, description: "A required field is missing, the phase is not one of the four, or two rubric criteria share an id." }, ...notAdmin },
      route: { method: "PUT", path: base },
    }),
    reviews: action({
      description: "Every review of the event, newest first, with optional filters.",
      auth: "admin",
      input: reviewFilters,
      output: reviewsOutput,
      errors: notAdmin,
      route: { method: "GET", path: `${base}/admin/reviews`, query: ["round", "teamId", "judgeId"] },
    }),
  },
});
