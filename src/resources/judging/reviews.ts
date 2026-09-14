import { resource, action, str, list, ref, oneOf, type Fields } from "../../core/define.js";
import { Review } from "./entities.js";
import { judgingScope, base, ROUNDS, unknownCode } from "./shared.js";

export const reviewFilters = {
  round: oneOf(ROUNDS, { optional: true, description: "Restrict to a round." }),
  teamId: str({ optional: true, description: "Restrict to a team." }),
  judgeId: str({ optional: true, description: "Restrict to a judge." }),
} satisfies Fields;
export const reviewsOutput = list(ref(Review, { description: "A review." }), { description: "Matching reviews, newest first." });

export const reviews = resource({
  singular: "review",
  plural: "reviews",
  scope: judgingScope,
  entity: Review,
  description: "Scores, as a judge or team may see them. `bt.judging(e, y).reviews.list()`; organizers use `admin.reviews()`.",
  collection: {
    list: action({
      description: "Reviews, newest first, with optional filters. A judge sees everything when `allowJudgeSeeOthers`, else only their own. A team sees only its own, and only when `showTeamFeedback`.",
      auth: "judgingCode",
      input: reviewFilters,
      output: reviewsOutput,
      errors: { ...unknownCode, Forbidden: { status: 403, description: "A team code asked before `showTeamFeedback` is on." } },
      route: { method: "GET", path: `${base}/reviews`, query: ["round", "teamId", "judgeId"] },
    }),
  },
});
