import { entity, resource, action, str, int, num, json, list, obj, record, ref } from "../dsl.js";

// ─── Entities ─────────────────────────────────────────────────────────

export const Team = entity({
  name: "Team",
  description:
    "A team of registrants at one event (hackathons, case comps). Keyed by a UUID and the composite `eventID;year`. Stored in biztechTeams<stage>.",
  storage: { table: "biztechTeams", pk: "id", sk: "eventID;year" },
  fields: {
    id: str({ description: "UUID." }),
    teamName: str({ description: "Display name, chosen by the team." }),
    "eventID;year": str({ description: "Composite key `<eventId>;<year>`." }),
    memberIDs: list(str({ description: "Member email." }), { optional: true, description: "Member emails. Omitted from `teams.list` for non-admin callers." }),
    memberNames: list(str({ description: "Member first name." }), { optional: true, description: "Member first names, parallel to memberIDs when present." }),
    scannedQRs: list(str({ description: "QR id." }), { optional: true, description: "QR codes any member has scanned." }),
    points: int({ optional: true, description: "Points earned." }),
    pointsSpent: int({ optional: true, description: "Points spent in the event store." }),
    transactions: list(str({ description: "Transaction id." }), { optional: true, description: "Store transaction ids." }),
    inventory: list(str({ description: "Item id." }), { optional: true, description: "Items bought." }),
    submission: str({ optional: true, description: "Submission link (Devpost, GitHub, …). Empty string when none." }),
    metadata: json({ optional: true, description: "Free-form per-event data." }),
    funding: num({ optional: true, description: "BTX funding, if applicable." }),
  },
});

export const JudgeScores = entity({
  name: "JudgeScores",
  description: "A judge's five metric scores for one team in one round. The backend has exactly five numbered metrics; what each means is defined by the event's rubric, not the API.",
  fields: {
    metric1: num({ description: "Score for rubric criterion 1." }),
    metric2: num({ description: "Score for rubric criterion 2." }),
    metric3: num({ description: "Score for rubric criterion 3." }),
    metric4: num({ description: "Score for rubric criterion 4." }),
    metric5: num({ description: "Score for rubric criterion 5." }),
  },
});

export const JudgeSubmission = entity({
  name: "JudgeSubmission",
  description: "One judge's scores and feedback for one team in one round, as returned by the feedback endpoints.",
  fields: {
    judgeID: str({ description: "Judge's email. Judges are partner registrations (`Registration.isPartner`)." }),
    judgeName: str({ optional: true, description: "Judge display name, if set at submission." }),
    scores: ref(JudgeScores, { optional: true, description: "The five metric scores." }),
    feedback: json({ optional: true, description: "Written feedback. A string or an object keyed by criterion; both occur." }),
    createdAt: str({ optional: true, description: "ISO-8601 timestamp of submission." }),
    teamName: str({ optional: true, description: "Team name at submission time." }),
  },
});

export const NormalizedTeamScore = entity({
  name: "NormalizedTeamScore",
  description: "A team's aggregate for the current round, with judge scores z-normalized so a harsh judge and a generous judge count equally.",
  fields: {
    teamID: str({ description: "`<teamId>;<round>` — the composite feedback key, NOT the bare team id. Split on `;` to get the team." }),
    teamName: str({ description: "Team name." }),
    zScoreWeighted: num({ description: "Weighted mean of z-scored metrics across judges. Higher is better." }),
    judges: list(str({ description: "Judge email." }), { description: "Judges who scored this team." }),
    originalResponses: list(
      obj(
        {
          judge: str({ description: "Judge email." }),
          metric1: num({ description: "Raw score." }),
          metric2: num({ description: "Raw score." }),
          metric3: num({ description: "Raw score." }),
          metric4: num({ description: "Raw score." }),
          metric5: num({ description: "Raw score." }),
        },
        { description: "One judge's raw scores." },
      ),
      { description: "Raw per-judge scores before normalization." },
    ),
  },
});

// ─── Shared inputs ────────────────────────────────────────────────────

const eventKey = {
  eventID: str({ description: "Event id (slug)." }),
  year: int({ description: "Event year." }),
};
const ok = (what: string) => obj({ message: str({ description: "Human-readable confirmation." }) }, { description: what });

// ─── Resources ────────────────────────────────────────────────────────

export const teams = resource({
  singular: "team",
  plural: "teams",
  entity: Team,
  description: "Teams at an event. `bt.teams` for collection actions, `bt.team(id)` for judging actions on one team.",
  key: { id: str({ description: "Team UUID." }) },
  collection: {
    list: action({
      description: "All teams for an event. Member emails (`memberIDs`) are stripped unless the caller is an admin.",
      auth: "authenticated",
      input: eventKey,
      output: list(ref(Team, { description: "A team." }), { description: "Teams for the event." }),
      route: { method: "GET", path: "/team/{eventID}/{year}" },
    }),
    scores: action({
      description: "Every team's normalized aggregate score for the current judging round. Public. Empty array before any judge has submitted.",
      auth: "public",
      output: list(ref(NormalizedTeamScore, { description: "One team's aggregate." }), { description: "Aggregates, unordered." }),
      route: { method: "GET", path: "/team/scores-all" },
    }),
    forUser: action({
      description: "The team a user belongs to at an event.",
      auth: "public",
      input: { user_id: str({ description: "Member email." }), ...eventKey },
      output: obj({ message: str({ description: "Confirmation." }), response: ref(Team, { description: "The team." }) }, { description: "Wrapper around the team." }),
      errors: { TeamNotFound: { status: 404, description: "User is not on a team for this event." } },
      route: { method: "POST", path: "/team/getTeamFromUserID" },
    }),
    create: action({
      description: "Create a team with the given members. Members must be registered for the event.",
      auth: "authenticated",
      input: {
        team_name: str({ description: "Team name." }),
        ...eventKey,
        memberIDs: list(str({ description: "Member email." }), { description: "Initial members' emails." }),
      },
      output: obj({ message: str({ description: "Confirmation." }), response: ref(Team, { description: "The new team." }) }, { description: "Wrapper around the created team." }),
      route: { method: "POST", path: "/team/make" },
    }),
    join: action({
      description: "Add a member to an existing team.",
      auth: "authenticated",
      input: { memberID: str({ description: "Joining member's email." }), ...eventKey, teamID: str({ description: "Team UUID to join." }) },
      output: ok("Confirmation; `response` echoes the input."),
      route: { method: "POST", path: "/team/join" },
    }),
    leave: action({
      description: "Remove a member from their team.",
      auth: "authenticated",
      input: { memberID: str({ description: "Leaving member's email." }), ...eventKey },
      output: ok("Confirmation; `response` echoes the input."),
      route: { method: "POST", path: "/team/leave" },
    }),
    rename: action({
      description: "Rename the team a user belongs to.",
      auth: "public",
      input: { user_id: str({ description: "A member's email." }), ...eventKey, team_name: str({ description: "New name." }) },
      output: ok("Confirmation."),
      route: { method: "POST", path: "/team/changeTeamName" },
    }),
    addPoints: action({
      description: "Add (or subtract, with a negative number) points to the team a user belongs to.",
      auth: "public",
      input: { user_id: str({ description: "A member's email." }), ...eventKey, change_points: int({ description: "Delta. Negative subtracts." }) },
      output: obj({ message: str({ description: "Confirmation." }), updatedPoints: int({ description: "Team's new total." }) }, { description: "New total." }),
      errors: { TeamNotFound: { status: 404, description: "User is not on a team for this event." } },
      route: { method: "PUT", path: "/team/points" },
    }),
  },
  instance: {
    feedback: action({
      description:
        "All judge submissions for this team, grouped by round. Note: when the team has no feedback the backend currently returns HTTP 500 or 502 (it throws its 404 inside a try, and API Gateway reports the unhandled throw as 502). Catch ApiError with status >= 500 and treat it as empty until that is fixed.",
      auth: "public",
      output: obj(
        {
          message: str({ description: "Confirmation." }),
          scores: record(list(ref(JudgeSubmission, { description: "One judge's submission." }), { description: "Submissions in this round." }), { description: "Keyed by round, e.g. `\"1\"`." }),
        },
        { description: "Submissions by round." },
      ),
      route: { method: "GET", path: "/team/feedback/{id}" },
    }),
    assignJudges: action({
      description: "Point the given judges at this team for the current round. Judges who already scored this team in this round are skipped.",
      auth: "public",
      input: { judgeIDs: list(str({ description: "Judge email." }), { description: "Judges to assign." }) },
      output: ok("Confirmation."),
      errors: { AllJudgesDone: { status: 409, description: "Every listed judge has already scored this team this round." } },
      route: { method: "PUT", path: "/team/judge/currentTeam/{id}" },
    }),
  },
});

export const legacyJudges = resource({
  singular: "legacyJudge",
  description: "The teams service's original five-metric judging flow, keyed by judge email (judges are partner registrations). Superseded by `bt.judging(eventID, year)` for new events; kept for anything still on the old flow. `bt.legacyJudge(email)`.",
  key: { judgeID: str({ description: "Judge's email." }) },
  instance: {
    currentTeam: action({
      description: "The team this judge is currently assigned to.",
      auth: "public",
      output: obj(
        {
          message: str({ description: "Confirmation." }),
          currentTeamID: str({ description: "Assigned team UUID." }),
          currentTeamName: str({ nullable: true, description: "Team name, or null if the team record is missing." }),
        },
        { description: "Current assignment." },
      ),
      route: { method: "GET", path: "/team/judge/currentTeamID/{judgeID}" },
    }),
    submissions: action({
      description:
        "Everything this judge has submitted, grouped by round. Note: with no submissions the backend currently returns HTTP 500 or 502 (it throws its 404 inside a try, and API Gateway reports the unhandled throw as 502). Catch ApiError with status >= 500 and treat it as empty until that is fixed.",
      auth: "public",
      output: obj(
        {
          message: str({ description: "Confirmation." }),
          scores: record(
            list(
              obj(
                {
                  round: str({ description: "Round number as a string." }),
                  judgeID: str({ description: "Judge email." }),
                  judgeName: str({ optional: true, description: "Judge display name." }),
                  scores: ref(JudgeScores, { optional: true, description: "The five metrics." }),
                  feedback: json({ optional: true, description: "Written feedback; string or object." }),
                  teamID: str({ description: "Team UUID." }),
                  teamName: str({ optional: true, description: "Team name at submission." }),
                  createdAt: str({ optional: true, description: "ISO-8601." }),
                },
                { description: "One submission." },
              ),
              { description: "Submissions in this round." },
            ),
            { description: "Keyed by round." },
          ),
        },
        { description: "Submissions by round." },
      ),
      route: { method: "GET", path: "/team/judge/feedback/{judgeID}" },
    }),
    submit: action({
      description:
        "Submit scores for a team in the *current* round (the round is read server-side from `bt.judgingRound`). All five metrics must be non-zero; the backend treats 0 as missing. One submission per judge per team per round.",
      auth: "public",
      input: {
        teamID: str({ description: "Team UUID." }),
        ...eventKey,
        scores: ref(JudgeScores, { description: "Five metric scores, all non-zero." }),
        feedback: json({ optional: true, description: "Written feedback; string or object keyed by criterion." }),
      },
      output: ok("Confirmation."),
      errors: {
        InvalidScores: { status: 400, description: "A metric is missing or zero." },
        NotAJudge: { status: 409, description: "No partner registration for this judge at this event, or already submitted for this team this round." },
      },
      route: { method: "POST", path: "/team/judge/feedback" },
    }),
    updateSubmission: action({
      description: "Edit an existing submission for a team and round.",
      auth: "public",
      input: {
        teamID: str({ description: "Team UUID." }),
        round: str({ description: "Round the submission was made in." }),
        scores: ref(JudgeScores, { optional: true, description: "Replacement scores." }),
        feedback: json({ optional: true, description: "Replacement feedback." }),
        judgeName: str({ optional: true, description: "Replacement judge display name." }),
      },
      output: ok("Confirmation."),
      route: { method: "PUT", path: "/team/judge/feedback" },
    }),
  },
});

export const judgingRound = resource({
  singular: "judgingRound",
  description: "The single global judging round counter. A singleton: `bt.judgingRound.get()`. Note it is global, not per event.",
  instance: {
    get: action({
      description: "The current round.",
      auth: "public",
      output: obj({ round: str({ description: "Round identifier, e.g. `\"1\"`. A string on the wire." }) }, { description: "Current round." }),
      route: { method: "GET", path: "/team/round" },
    }),
    set: action({
      description: "Set the current round. Affects every subsequent `judge.submit`.",
      auth: "public",
      input: { round: str({ description: "New round identifier." }) },
      output: ok("Confirmation."),
      route: { method: "PUT", path: "/team/round/{round}" },
    }),
  },
});
