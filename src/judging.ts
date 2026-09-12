/**
 * Hackathon judging, used by bt-judging. Served by serverless-biztechapp/services/teams/handlerJudging.ts.
 *
 * One event's judging is one backend row: settings, rubric, links, judges and teams. Reviews
 * are separate rows. Nobody has an account: judges and teams log in with a code, and that code
 * is the bearer token. `bt.judging(e, y).get()` with a code returns the event and who you are.
 */
import { entity, resource, action, link, str, int, num, bool, list, obj, record, ref, oneOf, type Fields } from "./define.js";

export const judgingScope = {
  name: "judging",
  description: "One event's judging. Keyed like Event: (eventID, year).",
  key: {
    eventID: str({ description: "Event id (slug), e.g. `hellohacks`." }),
    year: int({ description: "Event year." }),
  } satisfies Fields,
};
const base = "/judging/{eventID}/{year}";
const PHASES = ["submission", "prelim", "finals", "closed"] as const;

// ─── Entities ─────────────────────────────────────────────────────────

export const JudgingSettings = entity({
  name: "JudgingSettings",
  description: "Event phase and switches. Part of JudgingEvent.",
  fields: {
    eventName: str({ description: "Display name, e.g. `HelloHacks 2027`." }),
    phase: oneOf(PHASES, { description: "`submission`: teams edit their entries. `prelim`: judges score. `finals`: finals judges score finalist teams. `closed`: nothing changes." }),
    finalsTeamIds: list(str({ description: "Team id." }), { description: "Teams in the finals round. Empty until finals are set up." }),
    finalsJudgeIds: list(str({ description: "Judge id." }), { description: "Judges who score finals. Empty until finals are set up." }),
    showTeamFeedback: bool({ description: "Teams may see their own reviews." }),
    allowJudgeSeeOthers: bool({ description: "Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own." }),
    anonymizeTeams: bool({ description: "Hide team names from judges. A UI concern; the API still returns names." }),
    lockSubmissions: bool({ description: "Teams may no longer edit their entries, regardless of phase." }),
    maxImages: int({ description: "Maximum screenshots per team." }),
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
          id: str({ description: "Stable id; the key in Review.scores." }),
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
  isAdmin: bool({ optional: true, description: "This judge's code also grants the organizer role." }),
  assignedTeamIds: list(str({ description: "Team id." }), { optional: true, description: "Teams this judge scores in prelims, in order." }),
  code: str({ optional: true, description: "Login code. Only returned to admins; minted by the backend when absent." }),
} satisfies Fields;

export const Judge = entity({
  name: "Judge",
  description: "A judge for one event. No BizTech account; logs in with `code`.",
  fields: { id: str({ description: "Assigned by the backend." }), ...judgeFields },
});

const teamFields = {
  name: str({ description: "Team name." }),
  members: list(str({ description: "Member name." }), { description: "Member display names." }),
  description: str({ optional: true, description: "Project pitch." }),
  github: str({ optional: true, description: "Repository URL." }),
  devpost: str({ optional: true, description: "Devpost URL." }),
  imageUrls: list(str({ description: "Image URL." }), { optional: true, description: "Screenshots, as URLs." }),
} satisfies Fields;

export const JudgingTeam = entity({
  name: "JudgingTeam",
  description: "A team being judged. Not the main app's Team; hackathon teams live inside JudgingEvent.",
  fields: { id: str({ description: "Assigned by the backend." }), ...teamFields, code: str({ optional: true, description: "Login code for the team's own pages. Only returned to admins; minted by the backend when absent." }) },
});

export const JudgingPrincipal = entity({
  name: "JudgingPrincipal",
  description: "Who a code belongs to. Returned as `me` by `judging.get`.",
  fields: {
    role: oneOf(["admin", "judge", "team"], { description: "What the code grants. Admin is an organizer or a judge with `isAdmin`." }),
    id: str({ description: "Judge id or team id. For the stage-wide organizer code, the string `admin`." }),
    name: str({ description: "Display name." }),
  },
});

export const JudgingEvent = entity({
  name: "JudgingEvent",
  description: "Everything about one event's judging except the reviews. One backend row, read and replaced whole.",
  fields: {
    me: ref(JudgingPrincipal, { optional: true, description: "The caller. Present on `get`, absent on `set`." }),
    updatedAt: str({ description: "ISO-8601, set by the backend on every write." }),
    settings: ref(JudgingSettings, { description: "Phase and switches." }),
    rubric: ref(Rubric, { nullable: true, description: "The rubric, or null before one is set." }),
    links: list(ref(JudgingLink, { description: "A link." }), { description: "Home-page links, in order." }),
    judges: list(ref(Judge, { description: "A judge." }), { description: "Every judge. Codes only for admins." }),
    teams: list(ref(JudgingTeam, { description: "A team." }), { description: "Every team. Codes only for admins." }),
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
    round: oneOf(["prelim", "finals"], { description: "Round the review belongs to; the phase at submission." }),
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

// ─── Resources ────────────────────────────────────────────────────────

export const judging = resource({
  singular: "judging",
  scope: judgingScope,
  entity: JudgingEvent,
  description: "The event's judging as one document. `bt.judging(e, y).get()` reads it and logs in; `.set()` replaces it.",
  instance: {
    info: action({
      description: "Event name, phase and links, for the landing page before anyone logs in.",
      auth: "public",
      output: ref(JudgingInfo, { description: "Name, phase, links." }),
      errors: { EventNotFound: { status: 404, description: "No judging has been set up for this event. `set` creates it." } },
      route: { method: "GET", path: base },
    }),
    get: action({
      description: "The whole document as the bearer code may see it, plus `me`. Judge and team codes are included only for admins. This is also login: send the code and a 401 means it is not recognized.",
      auth: "judgingCode",
      output: ref(JudgingEvent, { description: "The document, with `me`." }),
      errors: {
        UnknownCode: { status: 401, description: "No judge, team or organizer code matches." },
        EventNotFound: { status: 404, description: "The code is the organizer code but no judging exists for this event yet." },
      },
      route: { method: "GET", path: base },
    }),
    set: action({
      description: "Replace the whole document, creating it if needed. Judges and teams without an `id` or `code` get one minted. The response includes every code. Last write wins.",
      auth: "judgingAdmin",
      input: {
        settings: ref(JudgingSettings, { description: "Phase and switches." }),
        rubric: ref(Rubric, { optional: true, nullable: true, description: "The rubric. Omit or null for none." }),
        links: list(ref(JudgingLink, { description: "A link." }), { description: "Home-page links." }),
        judges: list(obj({ id: str({ optional: true, description: "Keep an existing judge's id; omit for a new one." }), ...judgeFields }, { description: "A judge." }), { description: "Every judge." }),
        teams: list(obj({ id: str({ optional: true, description: "Keep an existing team's id; omit for a new one." }), ...teamFields, code: str({ optional: true, description: "Keep an existing team's code; omit to mint one." }) }, { description: "A team." }), { description: "Every team." }),
      },
      output: ref(JudgingEvent, { description: "The stored document with every code." }),
      route: { method: "PUT", path: base },
    }),
  },
});

export const judgingTeams = resource({
  singular: "team",
  scope: judgingScope,
  entity: JudgingTeam,
  description: "One team. `bt.judging(e, y).team(id).update(…)` edits its entry, `.review(…)` scores it.",
  key: { id: str({ description: "Team id." }) },
  instance: {
    update: action({
      description: "Replace the team's editable fields. The team's own code may do this while the phase is `submission` and submissions are not locked; admins may at any time.",
      auth: "judgingCode",
      input: teamFields,
      output: ref(JudgingTeam, { description: "The updated team, without its code." }),
      errors: {
        TeamNotFound: { status: 404, description: "No such team." },
        Forbidden: { status: 403, description: "A team code tried to edit a different team." },
        SubmissionsClosed: { status: 409, description: "Phase is past `submission`, or `lockSubmissions` is on, or too many images." },
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
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidScores: { status: 406, description: "A criterion is missing, extra, or out of range." },
        PhaseClosed: { status: 409, description: "Judging is not open, or this judge or team is not in the finals." },
      },
      route: { method: "PUT", path: `${base}/reviews/{id}` },
    }),
  },
  links: {
    reviews: link({ description: "Reviews of this team across rounds.", via: "judging.reviews.list", map: { eventID: "eventID", year: "year", teamId: "id" } }),
  },
});

export const reviews = resource({
  singular: "review",
  plural: "reviews",
  scope: judgingScope,
  entity: Review,
  description: "Scores. `bt.judging(e, y).reviews.list()`; a judge submits with `team(id).review(…)`.",
  collection: {
    list: action({
      description: "Reviews, newest first, with optional filters. Admins see everything. Judges see everything when `allowJudgeSeeOthers`, else only their own. A team code sees only its own team's, and only when `showTeamFeedback`.",
      auth: "judgingCode",
      input: {
        round: oneOf(["prelim", "finals"], { optional: true, description: "Restrict to a round." }),
        teamId: str({ optional: true, description: "Restrict to a team." }),
        judgeId: str({ optional: true, description: "Restrict to a judge." }),
      },
      output: list(ref(Review, { description: "A review." }), { description: "Matching reviews, newest first." }),
      errors: { Forbidden: { status: 403, description: "A team code asked before results are public." } },
      route: { method: "GET", path: `${base}/reviews`, query: ["round", "teamId", "judgeId"] },
    }),
  },
});
