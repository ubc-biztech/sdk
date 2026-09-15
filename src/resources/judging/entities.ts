import { entity, str, int, num, bool, list, obj, record, ref, oneOf, type Fields } from "../../core/define.js";
import { PHASES, ROUNDS } from "./shared.js";

export const JudgingSchedule = entity({
  name: "JudgingSchedule",
  description: "Prelim presentation schedule kept by the portal: rooms of judges, timed blocks, and which team presents in which room during which block. Stored inside settings; the backend does not interpret it. The portal derives each judge's `assignedTeamIds` from their room.",
  fields: {
    rooms: list(obj({
      id: str({ description: "Chosen by the portal." }),
      name: str({ description: "Room name, e.g. `Room A`." }),
      judgeIds: list(str({ description: "Judge id." }), { description: "Judges who sit in this room for every block." }),
    }, { description: "A room." }), { description: "Rooms, in display order." }),
    blocks: list(obj({
      id: str({ description: "Chosen by the portal." }),
      label: str({ description: "Display label, e.g. `Block 1`." }),
      startsAt: str({ description: "Start time as entered, e.g. `13:00`." }),
    }, { description: "A block: every room judges at the same time." }), { description: "Blocks, in time order." }),
    slots: list(obj({
      blockId: str({ description: "Block id." }),
      roomId: str({ description: "Room id." }),
      teamId: str({ description: "Team id." }),
    }, { description: "One team presenting in one room during one block." }), { description: "Every scheduled presentation." }),
    activeBlockId: str({ optional: true, description: "The block organizers have marked as happening now. Absent until one is set." }),
    changes: list(obj({
      at: str({ description: "ISO-8601, when the organizer saved." }),
      message: str({ description: "What moved, e.g. `Team X: Block 1 / Room A → Block 2 / Room A`." }),
    }, { description: "One logged change." }), { description: "Newest first. The portal keeps the last 200." }),
  },
});

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
    schedule: ref(JudgingSchedule, { optional: true, description: "Prelim presentation schedule. Absent until the portal creates one." }),
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

export const judgeFields = {
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

export const teamFields = {
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
