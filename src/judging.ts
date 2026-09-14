/**
 * Hackathon judging, used by bt-judging. Served by serverless-biztechapp/services/teams/handlerJudging.ts.
 *
 * One event's judging is one backend row: settings, rubric, links, judges and teams. Reviews
 * are separate rows. Two kinds of caller:
 *
 * - Judges and teams have no BizTech account. An organizer mints them a code, and the code
 *   goes in the `X-Judging-Code` header. `bt.judging(e, y).get()` with a code returns the
 *   event and who the code belongs to, so it doubles as login.
 * - Organizers sign in with their BizTech exec account (Cognito). Their routes live under
 *   `bt.judging(e, y).admin` and send the ID token, never a code.
 */
import { entity, resource, action, link, str, int, num, bool, list, obj, record, ref, oneOf, type Fields } from "./define.js";

export const judgingScope = {
  name: "judging",
  description: "One event's judging. Keyed like an event: (eventID, year).",
  key: {
    eventID: str({ description: "Event id (slug), e.g. `hellohacks`." }),
    year: int({ description: "Event year." }),
  } satisfies Fields,
};
const base = "/judging/{eventID}/{year}";
const PHASES = ["submission", "prelim", "finals", "closed"] as const;
const ROUNDS = ["prelim", "finals"] as const;

// ─── Entities ─────────────────────────────────────────────────────────

export const JudgingSettings = entity({
  name: "JudgingSettings",
  description: "Event phase and switches. Part of JudgingEvent. The backend enforces `phase`, `lockSubmissions`, `maxImages`, `finalsTeamIds`, `finalsJudgeIds`, `showTeamFeedback` and `allowJudgeSeeOthers`; the rest is stored for the portal.",
  fields: {
    eventName: str({ description: "Display name, e.g. `HelloHacks 2027`." }),
    phase: oneOf(PHASES, { description: "`submission`: teams edit their entries. `prelim`: judges score. `finals`: finals judges score finalist teams. `closed`: nothing changes." }),
    finalsTeamIds: list(str({ description: "Team id." }), { description: "Teams in the finals round. Empty until finals are set up." }),
    finalsJudgeIds: list(str({ description: "Judge id." }), { description: "Judges who score finals. Empty until finals are set up." }),
    showTeamFeedback: bool({ description: "Teams may read their own reviews. When false, `reviews.list` with a team code is 403." }),
    allowJudgeSeeOthers: bool({ description: "Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own." }),
    anonymizeTeams: bool({ description: "Hide team names from judges. A UI concern; the API still returns names." }),
    lockSubmissions: bool({ description: "Teams may no longer edit their entries, regardless of phase." }),
    maxImages: int({ description: "Maximum screenshots per team, enforced on `team.update`." }),
    perTeamJudges: int({ optional: true, description: "How many judges the portal's auto-assign gives each team. Stored, not enforced." }),
    finalsTopN: int({ optional: true, description: "How many prelim teams the portal advances to finals by default. Stored, not enforced." }),
  },
});

export const Rubric = entity({
  name: "Rubric",
  description: "What judges score against. Reviews carry one score per criterion; totals are computed from this.",
  fields: {
    name: str({ description: "Rubric name." }),
    scaleMax: int({ description: "Highest score on a criterion unless it sets `maxScore`." }),
    scoreMode: oneOf(["points", "weighted"], { description: "`points`: total is the sum of raw scores. `weighted`: each score is multiplied by its criterion's weight." }),
    criteria: list(
      obj(
        {
          id: str({ description: "Stable id; the key in Review.scores. Unique within the rubric." }),
          label: str({ description: "Short name shown to judges." }),
          description: str({ optional: true, description: "Guidance shown under the label." }),
          weight: num({ description: "Multiplier in `weighted` mode; 1 is neutral." }),
          maxScore: int({ optional: true, description: "Overrides scaleMax for this criterion." }),
        },
        { description: "One criterion." },
      ),
      { description: "Criteria in display order." },
    ),
  },
});

export const JudgingLink = entity({
  name: "JudgingLink",
  description: "A link on the portal home page (schedule, Discord, rules).",
  fields: {
    id: str({ description: "Chosen by the portal." }),
    label: str({ description: "Link text." }),
    url: str({ description: "Destination." }),
  },
});

const judgeFields = {
  name: str({ description: "Display name, shown on reviews." }),
  assignedTeamIds: list(str({ description: "Team id." }), { optional: true, description: "Teams this judge scores in prelims, in order. Chosen by the portal; not enforced by the backend." }),
} satisfies Fields;

export const Judge = entity({
  name: "Judge",
  description: "A judge for one event. No BizTech account; logs in with `code`.",
  fields: {
    id: str({ description: "Assigned by the backend." }),
    ...judgeFields,
    code: str({ optional: true, description: "Login code. Only in `admin.get` and `admin.set` responses; minted by the backend when absent." }),
  },
});

const teamFields = {
  name: str({ description: "Team name." }),
  members: list(str({ description: "Member name." }), { description: "Member display names." }),
  description: str({ optional: true, description: "Project pitch." }),
  github: str({ optional: true, description: "Repository URL." }),
  devpost: str({ optional: true, description: "Devpost URL." }),
  imageUrls: list(str({ description: "Image URL." }), { optional: true, description: "Screenshots, as URLs. At most `settings.maxImages`." }),
} satisfies Fields;

export const JudgingTeam = entity({
  name: "JudgingTeam",
  description: "A team being judged. Lives inside JudgingEvent; logs in to its own pages with `code`.",
  fields: {
    id: str({ description: "Assigned by the backend." }),
    ...teamFields,
    code: str({ optional: true, description: "Login code for the team's own pages. Only in `admin.get` and `admin.set` responses; minted by the backend when absent." }),
  },
});

export const JudgingPrincipal = entity({
  name: "JudgingPrincipal",
  description: "Who a code belongs to. Returned as `me` by `judging.get`. Organizers are not principals; they are Cognito admins.",
  fields: {
    role: oneOf(["judge", "team"], { description: "What the code grants." }),
    id: str({ description: "Judge id or team id." }),
    name: str({ description: "Display name." }),
  },
});

export const JudgingEvent = entity({
  name: "JudgingEvent",
  description: "Everything about one event's judging except the reviews. One backend row, read and replaced whole.",
  fields: {
    me: ref(JudgingPrincipal, { optional: true, description: "The caller. Present on `get` (with a code); absent on the admin actions." }),
    updatedAt: str({ description: "ISO-8601, set by the backend on every write." }),
    settings: ref(JudgingSettings, { description: "Phase and switches." }),
    rubric: ref(Rubric, { nullable: true, description: "The rubric, or null before one is set." }),
    links: list(ref(JudgingLink, { description: "A link." }), { description: "Home-page links, in order." }),
    judges: list(ref(Judge, { description: "A judge." }), { description: "Every judge. Codes only on the admin actions." }),
    teams: list(ref(JudgingTeam, { description: "A team." }), { description: "Every team. Codes only on the admin actions." }),
  },
});

export const JudgingInfo = entity({
  name: "JudgingInfo",
  description: "What anyone may see before logging in.",
  fields: {
    settings: obj({ eventName: str({ description: "Display name." }), phase: oneOf(PHASES, { description: "Current phase." }) }, { description: "Name and phase only." }),
    links: list(ref(JudgingLink, { description: "A link." }), { description: "Home-page links, in order." }),
  },
});

export const Review = entity({
  name: "Review",
  description: "One judge's scores for one team in one round. Resubmitting replaces it.",
  fields: {
    id: str({ description: "`<round>__<teamId>__<judgeId>`." }),
    round: oneOf(ROUNDS, { description: "Round the review belongs to; the phase at submission." }),
    teamId: str({ description: "JudgingTeam id." }),
    judgeId: str({ description: "Judge id." }),
    judgeName: str({ description: "Judge display name at submission." }),
    scores: record(num({ description: "Score for the criterion." }), { description: "Keyed by Rubric.criteria[].id." }),
    feedback: str({ description: "Written feedback. Empty string when none." }),
    total: num({ description: "Sum of raw scores, computed by the backend." }),
    weightedTotal: num({ description: "Sum of score × weight, computed by the backend." }),
    completedAt: str({ description: "ISO-8601." }),
  },
});

// ─── Shared pieces ────────────────────────────────────────────────────

const reviewFilters = {
  round: oneOf(ROUNDS, { optional: true, description: "Restrict to a round." }),
  teamId: str({ optional: true, description: "Restrict to a team." }),
  judgeId: str({ optional: true, description: "Restrict to a judge." }),
} satisfies Fields;
const reviewsOutput = list(ref(Review, { description: "A review." }), { description: "Matching reviews, newest first." });
const unknownCode = { UnknownCode: { status: 401, description: "The code matches no judge or team of this event (or no judging exists for it yet)." } };
const notAdmin = { Forbidden: { status: 403, description: "The token is valid but its account is not a BizTech admin." } };

// ─── Resources ────────────────────────────────────────────────────────

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

export const judgingTeams = resource({
  singular: "team",
  scope: judgingScope,
  entity: JudgingTeam,
  description: "One team. `bt.judging(e, y).team(id).update(…)` is the team editing its own entry; `.review(…)` is a judge scoring it. Organizers edit teams through `admin.set`.",
  key: { id: str({ description: "Team id." }) },
  instance: {
    update: action({
      description: "Replace the team's editable fields. Only the team's own code, while the phase is `submission` and submissions are not locked.",
      auth: "judgingCode",
      input: teamFields,
      output: ref(JudgingTeam, { description: "The updated team, without its code." }),
      errors: {
        ...unknownCode,
        Forbidden: { status: 403, description: "The code belongs to a different team, or to a judge." },
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidInput: { status: 406, description: "`name` or `members` is missing." },
        SubmissionsClosed: { status: 409, description: "Phase is past `submission`, `lockSubmissions` is on, or there are more than `maxImages` images." },
      },
      route: { method: "PUT", path: `${base}/teams/{id}` },
    }),
    review: action({
      description: "Create or replace the caller's review of this team for the current phase's round. Every rubric criterion must be present and in range; totals are computed by the backend. Only while the phase is `prelim` or `finals`; in finals only finals judges may score finalist teams.",
      auth: "judge",
      input: {
        scores: record(num({ description: "Score." }), { description: "Keyed by criterion id. Every criterion, nothing else." }),
        feedback: str({ optional: true, description: "Written feedback." }),
      },
      output: ref(Review, { description: "The stored review with computed totals." }),
      errors: {
        ...unknownCode,
        Forbidden: { status: 403, description: "The code belongs to a team, not a judge." },
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidScores: { status: 406, description: "A criterion is missing, extra, or out of range." },
        PhaseClosed: { status: 409, description: "Judging is not open, there is no rubric, or this judge or team is not in the finals." },
      },
      route: { method: "PUT", path: `${base}/reviews/{id}` },
    }),
  },
  links: {
    reviews: link({ description: "Reviews of this team across rounds, as the code may see them.", via: "judging.reviews.list", map: { eventID: "eventID", year: "year", teamId: "id" } }),
  },
});

export const reviews = resource({
  singular: "review",
  plural: "reviews",
  scope: judgingScope,
  entity: Review,
  description: "Scores, as a judge or team may see them. `bt.judging(e, y).reviews.list()`; organizers use `admin.reviews()`.",
  collection: {
    list: action({
      description: "Reviews, newest first, with optional filters. A judge sees everything when `allowJudgeSeeOthers`, else only their own. A team sees only its own, and only when `showTeamFeedback`.",
      auth: "judgingCode",
      input: reviewFilters,
      output: reviewsOutput,
      errors: { ...unknownCode, Forbidden: { status: 403, description: "A team code asked before `showTeamFeedback` is on." } },
      route: { method: "GET", path: `${base}/reviews`, query: ["round", "teamId", "judgeId"] },
    }),
  },
});
