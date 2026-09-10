import type { Ontology } from "./dsl.js";
import { roles } from "./roles.js";
import { Event, EventCounts, events } from "./entities/event.js";
import { Registration, registrations } from "./entities/registration.js";
import { User, me, users } from "./entities/user.js";
import { Team, JudgeScores, JudgeSubmission, NormalizedTeamScore, teams, legacyJudges, judgingRound } from "./entities/team.js";
import {
  JudgingSettings, Rubric, JudgingTeam, Judge, Review, JudgingLink, JudgingSession,
  judgingSession, judgingSettings, judgingRubric, judgingTeams, judges, reviews, judgingLinks,
} from "./entities/judging.js";

/**
 * The ontology. One object; the generator reads nothing else.
 * Resource keys must equal each resource's `singular`.
 */
export const ontology: Ontology = {
  roles,
  entities: {
    Event, EventCounts, Registration, User, Team, JudgeScores, JudgeSubmission, NormalizedTeamScore,
    JudgingSettings, Rubric, JudgingTeam, Judge, Review, JudgingLink, JudgingSession,
  },
  resources: {
    event: events,
    registration: registrations,
    me,
    user: users,
    team: teams,
    legacyJudge: legacyJudges,
    judgingRound,
    // Generated service "judging", scoped under bt.judging(eventID, year)
    session: judgingSession,
    settings: judgingSettings,
    rubric: judgingRubric,
    judgingTeam: judgingTeams,
    judge: judges,
    review: reviews,
    link: judgingLinks,
  },
};
