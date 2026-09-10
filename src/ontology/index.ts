import type { Ontology } from "./dsl.js";
import { roles } from "./roles.js";
import { Event, EventCounts, events } from "./entities/event.js";
import { Registration, registrations } from "./entities/registration.js";
import { User, me, users } from "./entities/user.js";
import { Team, JudgeScores, JudgeSubmission, NormalizedTeamScore, teams, judges, judgingRound } from "./entities/team.js";

/**
 * The ontology. One object; the generator reads nothing else.
 * Resource keys must equal each resource's `singular`.
 */
export const ontology: Ontology = {
  roles,
  entities: { Event, EventCounts, Registration, User, Team, JudgeScores, JudgeSubmission, NormalizedTeamScore },
  resources: {
    event: events,
    registration: registrations,
    me,
    user: users,
    team: teams,
    judge: judges,
    judgingRound,
  },
};
