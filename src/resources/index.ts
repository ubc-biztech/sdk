import type { Api } from "../core/define.js";
import { roles } from "./roles.js";
import { JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review, judging, judgingAdmin, judgingTeams, reviews } from "./judging.js";

/**
 * Everything the client exposes, in one object. generate.ts reads nothing else.
 * Resource keys must equal each resource's `singular` (scoped resources may differ).
 *
 * Today this is the hackathon judging API only, for bt-judging. Other services come back
 * one declaration file at a time (`npm run new`).
 */
export const api: Api = {
  roles,
  entities: {
    JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review,
  },
  resources: {
    // Everything is scoped under bt.judging(eventID, year)
    judging,
    judgingAdmin,
    judgingTeam: judgingTeams,
    review: reviews,
  },
};
