import { JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review } from "./entities.js";
import { judging, judgingAdmin } from "./event.js";
import { judgingTeams } from "./teams.js";
import { reviews } from "./reviews.js";

export const entities = { JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review };
export const resources = { judging, judgingAdmin, judgingTeam: judgingTeams, review: reviews };
