import type { Api } from "../core/define.js";
import { roles } from "./roles.js";
import { JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review, judging, judgingAdmin, judgingTeams, reviews } from "./judging.js";

export const api: Api = {
  roles,
  entities: {
    JudgingEvent, JudgingInfo, JudgingSettings, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review,
  },
  resources: {
    judging,
    judgingAdmin,
    judgingTeam: judgingTeams,
    review: reviews,
  },
};
