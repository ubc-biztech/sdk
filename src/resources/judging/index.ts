import { judgingPortal, eventImage } from "./portal.js";
import { JudgingEvent, JudgingInfo, JudgingSettings, JudgingSchedule, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review } from "./entities.js";
import { judging, judgingAdmin } from "./event.js";
import { judgingTeams } from "./teams.js";
import { reviews } from "./reviews.js";

export const entities = { JudgingEvent, JudgingInfo, JudgingSettings, JudgingSchedule, Rubric, JudgingTeam, Judge, JudgingLink, JudgingPrincipal, Review };
export const resources = { judgingPortal, eventImage, judging, judgingAdmin, judgingTeam: judgingTeams, review: reviews };
