# `judging.review`

Scores, as a judge or team may see them. `bt.judging(e, y).reviews.list()`; organizers use `admin.reviews()`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like an event: (eventID, year).

## `bt.judging(eventID, year).reviews.list(input)`

Reviews, newest first, with optional filters. A judge sees everything when `allowJudgeSeeOthers`, else only their own. A team sees only its own, and only when `showTeamFeedback`.

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
| `UnknownCodeError` | 401 | The code matches no judge or team of this event (or no judging exists for it yet). |
| `ForbiddenError` | 403 | A team code asked before `showTeamFeedback` is on. |

