import { resource, action, link, str, num, record, ref } from "../../core/define.js";
import { JudgingTeam, Review, teamFields } from "./entities.js";
import { judgingScope, base, unknownCode } from "./shared.js";

export const judgingTeams = resource({
  singular: "team",
  scope: judgingScope,
  entity: JudgingTeam,
  description: "One team. `bt.judging(e, y).team(id).update(…)` is the team editing its own entry; `.review(…)` is a judge scoring it. Organizers edit teams through `admin.set`.",
  key: { id: str({ description: "Team id." }) },
  instance: {
    update: action({
      description: "Replace the team's editable fields. Only the team's own code, while the phase is `submission` and submissions are not locked.",
      auth: "judgingCode",
      input: teamFields,
      output: ref(JudgingTeam, { description: "The updated team, without its code." }),
      errors: {
        ...unknownCode,
        Forbidden: { status: 403, description: "The code belongs to a different team, or to a judge." },
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidInput: { status: 406, description: "`name` or `members` is missing." },
        SubmissionsClosed: { status: 409, description: "Phase is past `submission`, `lockSubmissions` is on, or there are more than `maxImages` images." },
      },
      route: { method: "PUT", path: `${base}/teams/{id}` },
    }),
    review: action({
      description: "Create or replace the caller's review of this team for the current phase's round. Every rubric criterion must be present and in range; totals are computed by the backend. Only while the phase is `prelim` or `finals`; in finals only finals judges may score finalist teams.",
      auth: "judge",
      input: {
        scores: record(num({ description: "Score." }), { description: "Keyed by criterion id. Every criterion, nothing else." }),
        feedback: str({ optional: true, description: "Written feedback." }),
      },
      output: ref(Review, { description: "The stored review with computed totals." }),
      errors: {
        ...unknownCode,
        Forbidden: { status: 403, description: "The code belongs to a team, not a judge." },
        TeamNotFound: { status: 404, description: "No such team." },
        InvalidScores: { status: 406, description: "A criterion is missing, extra, or out of range." },
        PhaseClosed: { status: 409, description: "Judging is not open, there is no rubric, or this judge or team is not in the finals." },
      },
      route: { method: "PUT", path: `${base}/reviews/{id}` },
    }),
  },
  links: {
    reviews: link({ description: "Reviews of this team across rounds, as the code may see them.", via: "judging.reviews.list", map: { eventID: "eventID", year: "year", teamId: "id" } }),
  },
});
