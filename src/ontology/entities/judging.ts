/**
 * The judging domain: what `bt-judging` (the HelloHacks judging portal) needs, declared once.
 *
 * Unlike everything else in this directory, these resources are served by a **generated**
 * service (`service: "judging"`): the SDK emits the router and the implementation contract,
 * and `serverless-biztechapp/services/teams/judgingHelpers.ts` supplies the business logic. There is no
 * hand-written handler to be honest about; this file *is* the API.
 *
 * Model follows the portal's Firestore shape so the migration is mechanical: settings,
 * rubric, teams, judges, reviews, links, plus a code-based session. Everything lives under
 * one event: `bt.judging("hellohacks", 2027).teams.list()`.
 */
import { entity, resource, action, str, int, num, bool, list, obj, record, ref, oneOf, type Fields } from "../dsl.js";

// ─── Scope ────────────────────────────────────────────────────────────

export const judgingScope = {
  name: "judging",
  description: "One event's judging. Keyed like Event: (eventID, year).",
  key: {
    eventID: str({ description: "Event id (slug), e.g. `hellohacks`." }),
    year: int({ description: "Event year." }),
  } satisfies Fields,
};
const S = "judging" as const;
const base = "/judging/{eventID}/{year}";
const ok = (what: string) => obj({ message: str({ description: "Human-readable confirmation." }) }, { description: what });

// ─── Entities ─────────────────────────────────────────────────────────

const PHASES = ["submission", "prelim", "finals", "closed"] as const;
const settingsFields = {
  eventName: str({ description: "Display name, e.g. `HelloHacks 2027`." }),
  phase: oneOf(PHASES, { description: "`submission`: teams edit their entries, no judging. `prelim`: all judges score their assigned teams. `finals`: finals judges score finalist teams. `closed`: nothing changes; results may be shown." }),
  perTeamJudges: int({ description: "How many judges auto-assign gives each team." }),
  finalsTopN: int({ description: "How many prelim teams advance to finals by default." }),
  finalsTeamIds: list(str({ description: "Team id." }), { description: "Teams in the finals round. Empty until finals are set up." }),
  finalsJudgeIds: list(str({ description: "Judge id." }), { description: "Judges who score finals. Empty until finals are set up." }),
  showTeamFeedback: bool({ description: "Teams may see their own reviews and the leaderboard." }),
  allowJudgeSeeOthers: bool({ description: "Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own." }),
  anonymizeTeams: bool({ description: "Hide team names from judges (UI concern; the API still returns names to judges)." }),
  lockSubmissions: bool({ description: "Teams may no longer edit their entries, regardless of phase." }),
  maxImages: int({ description: "Maximum screenshots per team." }),
};

export const JudgingSettings = entity({
  name: "JudgingSettings",
  description: "Per-event judging configuration and phase. One record per event.",
  fields: { ...settingsFields, updatedAt: str({ description: "ISO-8601." }) },
});

export const Rubric = entity({
  name: "Rubric",
  description: "The scoring rubric for an event. Reviews are scored per criterion against this; totals are computed from it.",
  fields: {
    name: str({ description: "Rubric name." }),
    scaleMax: int({ description: "Highest score on each criterion, e.g. 5 or 10." }),
    scoreMode: oneOf(["points", "weighted"], { description: "`points`: total is the sum of raw scores. `weighted`: each criterion is multiplied by its weight." }),
    criteria: list(
      obj(
        {
          id: str({ description: "Stable id; the key in Review.scores." }),
          label: str({ description: "Short name shown to judges." }),
          description: str({ optional: true, description: "Guidance shown under the label." }),
          weight: num({ description: "Multiplier in `weighted` mode; 1 means neutral." }),
          maxScore: int({ optional: true, description: "Overrides scaleMax for this criterion." }),
        },
        { description: "One criterion." },
      ),
      { description: "Criteria in display order." },
    ),
    updatedAt: str({ description: "ISO-8601." }),
  },
});

export const JudgingTeam = entity({
  name: "JudgingTeam",
  description: "A team being judged. Independent of the `Team` entity used by the main app; hackathon teams are created by organizers or self-registered with a code.",
  fields: {
    id: str({ description: "ULID, assigned on create." }),
    name: str({ description: "Team name." }),
    members: list(str({ description: "Member name." }), { description: "Member display names." }),
    description: str({ optional: true, description: "Project pitch. Markdown-ish." }),
    github: str({ optional: true, description: "Repository URL." }),
    devpost: str({ optional: true, description: "Devpost URL." }),
    imageUrls: list(str({ description: "Image URL." }), { description: "Screenshots. URLs only; upload is the client's concern for now." }),
    code: str({ optional: true, description: "Login code for the team's own feedback page. Only returned to `judgingAdmin`." }),
    createdAt: str({ description: "ISO-8601." }),
  },
});

export const Judge = entity({
  name: "Judge",
  description: "A judge for one event. Has no BizTech account; logs in with `code`.",
  fields: {
    id: str({ description: "ULID, assigned on create." }),
    name: str({ description: "Display name, shown on reviews." }),
    code: str({ optional: true, description: "Login code. Only returned to `judgingAdmin`." }),
    isAdmin: bool({ description: "This judge's code also grants `judgingAdmin`." }),
    assignedTeamIds: list(str({ description: "Team id." }), { description: "Teams this judge scores in prelims, in order." }),
  },
});

export const Review = entity({
  name: "Review",
  description: "One judge's scores for one team in one round. Id is deterministic (`<round>__<teamId>__<judgeId>`) so a resubmit replaces rather than duplicates.",
  fields: {
    id: str({ description: "`<round>__<teamId>__<judgeId>`." }),
    round: oneOf(["prelim", "finals"], { description: "Round the review belongs to." }),
    teamId: str({ description: "JudgingTeam id." }),
    judgeId: str({ description: "Judge id." }),
    judgeName: str({ description: "Judge display name at submission." }),
    scores: record(num({ description: "Score for the criterion." }), { description: "Keyed by Rubric.criteria[].id." }),
    feedback: str({ description: "Written feedback. Empty string when none." }),
    total: num({ description: "Sum of raw scores, computed server-side from the rubric at submission." }),
    weightedTotal: num({ description: "Sum of score × weight, computed server-side." }),
    completedAt: str({ description: "ISO-8601." }),
  },
});

export const JudgingLink = entity({
  name: "JudgingLink",
  description: "A link shown on the portal home page (schedule, Discord, rules).",
  fields: {
    id: str({ description: "ULID." }),
    label: str({ description: "Link text." }),
    url: str({ description: "Destination." }),
    order: int({ description: "Sort key, ascending." }),
  },
});

export const JudgingSession = entity({
  name: "JudgingSession",
  description: "Who a code belongs to. Returned by `session.login`; the code itself is then used as the bearer token.",
  fields: {
    role: oneOf(["judgingAdmin", "judge", "team"], { description: "What the code grants." }),
    id: str({ description: "Judge id or team id. For `judgingAdmin` codes that are not also a judge, the string `admin`." }),
    name: str({ description: "Display name." }),
    eventName: str({ description: "From JudgingSettings, so the client can render a header without a second call." }),
  },
});

// ─── Resources ────────────────────────────────────────────────────────

export const judgingSession = resource({
  singular: "session",
  scope: judgingScope,
  service: S,
  entity: JudgingSession,
  description: "Code login. `bt.judging(e, y).session.login({ code })` returns who the code is; keep the code as the bearer token afterwards.",
  instance: {
    login: action({
      description: "Resolve a code to a role and identity. Public, rate-limited by the gateway. Returns 404 for an unknown code rather than 401 so the response does not distinguish 'wrong code' from 'no such event'.",
      auth: "public",
      input: { code: str({ description: "The code the person typed. Case-insensitive, whitespace trimmed." }) },
      output: ref(JudgingSession, { description: "Who the code is." }),
      errors: { UnknownCode: { status: 404, description: "No judge, team or admin code matches." } },
      route: { method: "POST", path: `${base}/session/login` },
    }),
    me: action({
      description: "Who the current bearer code is. Use on page load to restore a session.",
      auth: "judgingCode",
      output: ref(JudgingSession, { description: "The caller." }),
      route: { method: "GET", path: `${base}/session` },
    }),
  },
});

export const judgingSettings = resource({
  singular: "settings",
  scope: judgingScope,
  service: S,
  entity: JudgingSettings,
  description: "Event phase and configuration. A singleton per event.",
  instance: {
    get: action({
      description: "Current settings. Public so the landing page can show the phase and event name before login.",
      auth: "public",
      output: ref(JudgingSettings, { description: "The settings." }),
      errors: { EventNotFound: { status: 404, description: "No judging has been set up for this event. `settings.set` creates it." } },
      route: { method: "GET", path: `${base}/settings` },
    }),
    set: action({
      description: "Create or replace settings. Creating is how an event's judging is initialized; the admin code is set out-of-band (see the service README).",
      auth: "judgingAdmin",
      input: settingsFields,
      output: ref(JudgingSettings, { description: "The stored settings." }),
      route: { method: "PUT", path: `${base}/settings` },
    }),
  },
});

export const judgingRubric = resource({
  singular: "rubric",
  scope: judgingScope,
  service: S,
  entity: Rubric,
  description: "The event's rubric. A singleton per event.",
  instance: {
    get: action({
      description: "The rubric. Judges need it to score; teams need it to read feedback.",
      auth: "judgingCode",
      output: ref(Rubric, { description: "The rubric." }),
      errors: { RubricNotFound: { status: 404, description: "No rubric set yet." } },
      route: { method: "GET", path: `${base}/rubric` },
    }),
    set: action({
      description: "Create or replace the rubric. Existing reviews keep their scores keyed by old criterion ids; totals are not recomputed.",
      auth: "judgingAdmin",
      input: {
        name: str({ description: "Rubric name." }),
        scaleMax: int({ description: "Max per criterion." }),
        scoreMode: oneOf(["points", "weighted"], { description: "Total mode." }),
        criteria: list(
          obj(
            {
              id: str({ description: "Stable id." }),
              label: str({ description: "Label." }),
              description: str({ optional: true, description: "Guidance." }),
              weight: num({ description: "Weight." }),
              maxScore: int({ optional: true, description: "Per-criterion max." }),
            },
            { description: "One criterion." },
          ),
          { description: "Criteria in order. At least one." },
        ),
      },
      output: ref(Rubric, { description: "The stored rubric." }),
      errors: { InvalidRubric: { status: 400, description: "No criteria, duplicate criterion ids, or a non-positive scale." } },
      route: { method: "PUT", path: `${base}/rubric` },
    }),
  },
});

const teamFields = {
  name: str({ description: "Team name." }),
  members: list(str({ description: "Member name." }), { description: "Member display names." }),
  description: str({ optional: true, description: "Project pitch." }),
  github: str({ optional: true, description: "Repository URL." }),
  devpost: str({ optional: true, description: "Devpost URL." }),
  imageUrls: list(str({ description: "Image URL." }), { optional: true, description: "Screenshots." }),
} satisfies Fields;

export const judgingTeams = resource({
  singular: "team",
  plural: "teams",
  scope: judgingScope,
  service: S,
  entity: JudgingTeam,
  description: "Teams being judged. `bt.judging(e, y).teams.list()`, `bt.judging(e, y).team(id).get()`.",
  key: { id: str({ description: "Team id." }) },
  collection: {
    list: action({
      description: "All teams, sorted by name. `code` is included only for `judgingAdmin` callers.",
      auth: "judgingCode",
      output: list(ref(JudgingTeam, { description: "A team." }), { description: "Teams by name." }),
      route: { method: "GET", path: `${base}/teams` },
    }),
    create: action({
      description: "Create a team. A login code is generated and returned.",
      auth: "judgingAdmin",
      input: teamFields,
      output: ref(JudgingTeam, { description: "The new team, including its code." }),
      route: { method: "POST", path: `${base}/teams` },
    }),
  },
  instance: {
    get: action({
      description: "One team. `code` only for `judgingAdmin`.",
      auth: "judgingCode",
      output: ref(JudgingTeam, { description: "The team." }),
      errors: { TeamNotFound: { status: 404, description: "No such team." } },
      route: { method: "GET", path: `${base}/teams/{id}` },
    }),
    update: action({
      description: "Replace the editable fields. A team's own code may update its own team while the phase is `submission` and submissions are not locked; admins may update any team at any time.",
      auth: "judgingCode",
      input: teamFields,
      output: ref(JudgingTeam, { description: "The updated team." }),
      errors: { TeamNotFound: { status: 404, description: "No such team." }, Forbidden: { status: 403, description: "A team code tried to edit a different team." }, SubmissionsLocked: { status: 409, description: "Phase is past `submission` or `lockSubmissions` is on." } },
      route: { method: "PUT", path: `${base}/teams/{id}` },
    }),
    delete: action({
      description: "Delete a team and its reviews.",
      auth: "judgingAdmin",
      output: ok("Deleted."),
      errors: { TeamNotFound: { status: 404, description: "No such team." } },
      route: { method: "DELETE", path: `${base}/teams/{id}` },
    }),
  },
  links: {
    reviews: { description: "Reviews of this team across rounds. Team codes see them only when results are public.", via: "judging.reviews.list", map: { eventID: "eventID", year: "year", teamId: "id" } },
  },
});

export const judges = resource({
  singular: "judge",
  plural: "judges",
  scope: judgingScope,
  service: S,
  entity: Judge,
  description: "Judges. `bt.judging(e, y).judges.list()`, `bt.judging(e, y).judge(id).get()`.",
  key: { id: str({ description: "Judge id." }) },
  collection: {
    list: action({
      description: "All judges. `code` only for `judgingAdmin`.",
      auth: "judge",
      output: list(ref(Judge, { description: "A judge." }), { description: "Judges by name." }),
      route: { method: "GET", path: `${base}/judges` },
    }),
    create: action({
      description: "Create a judge. A login code is generated and returned.",
      auth: "judgingAdmin",
      input: { name: str({ description: "Display name." }), isAdmin: bool({ optional: true, description: "Also grant the organizer role. Default false." }) },
      output: ref(Judge, { description: "The new judge, including its code." }),
      route: { method: "POST", path: `${base}/judges` },
    }),
    autoAssign: action({
      description: "Round-robin every team to `perTeamJudges` non-admin judges, replacing all existing prelim assignments.",
      auth: "judgingAdmin",
      input: { perTeamJudges: int({ optional: true, description: "Override JudgingSettings.perTeamJudges for this run." }) },
      output: record(list(str({ description: "Team id." }), { description: "Teams assigned to the judge." }), { description: "Judge id → team ids." }),
      errors: { NoJudges: { status: 409, description: "There are no non-admin judges to assign." } },
      route: { method: "POST", path: `${base}/judges/auto-assign` },
    }),
  },
  instance: {
    get: action({
      description: "One judge. `code` only for `judgingAdmin`.",
      auth: "judge",
      output: ref(Judge, { description: "The judge." }),
      errors: { JudgeNotFound: { status: 404, description: "No such judge." } },
      route: { method: "GET", path: `${base}/judges/{id}` },
    }),
    update: action({
      description: "Rename, toggle admin, or set assignments.",
      auth: "judgingAdmin",
      input: {
        name: str({ optional: true, description: "New name." }),
        isAdmin: bool({ optional: true, description: "Organizer role." }),
        assignedTeamIds: list(str({ description: "Team id." }), { optional: true, description: "Replace assignments." }),
      },
      output: ref(Judge, { description: "The updated judge." }),
      errors: { JudgeNotFound: { status: 404, description: "No such judge." } },
      route: { method: "PATCH", path: `${base}/judges/{id}` },
    }),
    delete: action({
      description: "Delete a judge. Their reviews are kept.",
      auth: "judgingAdmin",
      output: ok("Deleted."),
      errors: { JudgeNotFound: { status: 404, description: "No such judge." } },
      route: { method: "DELETE", path: `${base}/judges/{id}` },
    }),
  },
  links: {
    reviews: { description: "Everything this judge has submitted.", via: "judging.reviews.list", map: { eventID: "eventID", year: "year", judgeId: "id" } },
  },
});

export const reviews = resource({
  singular: "review",
  plural: "reviews",
  scope: judgingScope,
  service: S,
  entity: Review,
  description: "Scores. Judges submit with `reviews.submit`; everyone reads with `reviews.list`.",
  key: { id: str({ description: "Review id." }) },
  collection: {
    list: action({
      description: "Reviews, filtered. Admins see everything. Judges see everything when `allowJudgeSeeOthers`, else only their own. A team code sees only its own team's reviews, and only when `showTeamFeedback`.",
      auth: "judgingCode",
      input: {
        round: oneOf(["prelim", "finals"], { optional: true, description: "Restrict to a round." }),
        teamId: str({ optional: true, description: "Restrict to a team." }),
        judgeId: str({ optional: true, description: "Restrict to a judge." }),
      },
      output: list(ref(Review, { description: "A review." }), { description: "Matching reviews, newest first." }),
      errors: { Forbidden: { status: 403, description: "A team code asked for another team, or results are not public yet." } },
      route: { method: "GET", path: `${base}/reviews`, query: ["round", "teamId", "judgeId"] },
    }),
    submit: action({
      description: "Create or replace the caller's review of a team for the current phase's round. Totals are computed server-side from the rubric. Only allowed while the phase is `prelim` or `finals`; in finals only finals judges may score finalist teams.",
      auth: "judge",
      input: {
        teamId: str({ description: "Team being scored." }),
        scores: record(num({ description: "Score." }), { description: "Keyed by criterion id. Every rubric criterion must be present and within range." }),
        feedback: str({ optional: true, description: "Written feedback." }),
      },
      output: ref(Review, { description: "The stored review with computed totals." }),
      errors: {
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidScores: { status: 400, description: "A criterion is missing, extra, or out of range." },
        PhaseClosed: { status: 409, description: "The phase is `submission` or `closed`, or this judge is not a finals judge / team is not a finalist." },
      },
      route: { method: "POST", path: `${base}/reviews` },
    }),
  },
  instance: {
    get: action({
      description: "One review.",
      auth: "judgingCode",
      output: ref(Review, { description: "The review." }),
      errors: { ReviewNotFound: { status: 404, description: "No such review." }, Forbidden: { status: 403, description: "Not visible to this caller." } },
      route: { method: "GET", path: `${base}/reviews/{id}` },
    }),
    delete: action({
      description: "Delete a review.",
      auth: "judgingAdmin",
      output: ok("Deleted."),
      errors: { ReviewNotFound: { status: 404, description: "No such review." } },
      route: { method: "DELETE", path: `${base}/reviews/{id}` },
    }),
  },
});

export const judgingLinks = resource({
  singular: "link",
  plural: "links",
  scope: judgingScope,
  service: S,
  entity: JudgingLink,
  description: "Home-page links.",
  key: { id: str({ description: "Link id." }) },
  collection: {
    list: action({
      description: "All links in order.",
      auth: "public",
      output: list(ref(JudgingLink, { description: "A link." }), { description: "Links by order." }),
      route: { method: "GET", path: `${base}/links` },
    }),
    create: action({
      description: "Add a link.",
      auth: "judgingAdmin",
      input: { label: str({ description: "Text." }), url: str({ description: "Destination." }), order: int({ optional: true, description: "Sort key; default appends." }) },
      output: ref(JudgingLink, { description: "The new link." }),
      route: { method: "POST", path: `${base}/links` },
    }),
  },
  instance: {
    delete: action({
      description: "Remove a link.",
      auth: "judgingAdmin",
      output: ok("Deleted."),
      errors: { LinkNotFound: { status: 404, description: "No such link." } },
      route: { method: "DELETE", path: `${base}/links/{id}` },
    }),
  },
});

