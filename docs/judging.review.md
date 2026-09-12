# `judging.review`

Scores. `bt.judging(e, y).reviews.list()`; a judge submits with `team(id).review(…)`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year).

## `bt.judging(eventID, year).reviews.list(input)`

Reviews, newest first, with optional filters. Admins see everything. Judges see everything when `allowJudgeSeeOthers`, else only their own. A team code sees only its own team's, and only when `showTeamFeedback`.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/reviews`

**Input**

| Field | Type | Description |
|---|---|---|
| `round` | enum? | Restrict to a round. |
| `teamId` | string? | Restrict to a team. |
| `judgeId` | string? | Restrict to a judge. |

**Output:** [Review](./entities.md#review)[] — Matching reviews, newest first.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ForbiddenError` | 403 | A team code asked before results are public. |

