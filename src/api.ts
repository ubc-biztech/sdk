import type { Api } from "./define.js";
import { roles } from "./roles.js";
import { Event, EventCounts, events } from "./events.js";
import { Registration, registrations } from "./registrations.js";
import { User, me, users } from "./users.js";
import { Team, JudgeScores, JudgeSubmission, NormalizedTeamScore, teams, legacyJudges, judgingRound } from "./teams.js";
import { JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review, judging, judgingTeams, reviews } from "./judging.js";

/**
 * Everything the client exposes, in one object. generate.ts reads nothing else.
 * Resource keys must equal each resource's `singular`.
 */
export const api: Api = {
  roles,
  entities: {
    Event, EventCounts, Registration, User, Team, JudgeScores, JudgeSubmission, NormalizedTeamScore,
    JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review,
  },
  resources: {
    event: events,
    registration: registrations,
    me,
    user: users,
    team: teams,
    legacyJudge: legacyJudges,
    judgingRound,
    // Hackathon judging, scoped under bt.judging(eventID, year)
    judging,
    judgingTeam: judgingTeams,
    review: reviews,
  },
};
