# `judging.review`

Scores. Judges submit with `reviews.submit`; everyone reads with `reviews.list`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

**Key** (positional arguments of `bt.review(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Review id. |

## `bt.judging(eventID, year).reviews.list(input)`

Reviews, filtered. Admins see everything. Judges see everything when `allowJudgeSeeOthers`, else only their own. A team code sees only its own team's reviews, and only when `showTeamFeedback`.

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
| `ForbiddenError` | 403 | A team code asked for another team, or results are not public yet. |

## `bt.judging(eventID, year).reviews.submit(input)`

Create or replace the caller's review of a team for the current phase's round. Totals are computed server-side from the rubric. Only allowed while the phase is `prelim` or `finals`; in finals only finals judges may score finalist teams.

- **Auth:** `judge`
- **Route:** `POST /judging/{eventID}/{year}/reviews`

**Input**

| Field | Type | Description |
|---|---|---|
| `teamId` | string | Team being scored. |
| `scores` | record | Keyed by criterion id. Every rubric criterion must be present and within range. |
| `feedback` | string? | Written feedback. |

**Output:** [Review](./entities.md#review) — The stored review with computed totals.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |
| `InvalidScoresError` | 400 | A criterion is missing, extra, or out of range. |
| `PhaseClosedError` | 409 | The phase is `submission` or `closed`, or this judge is not a finals judge / team is not a finalist. |

## `bt.judging(eventID, year).review(id).get()`

One review.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/reviews/{id}`

**Output:** [Review](./entities.md#review) — The review.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ReviewNotFoundError` | 404 | No such review. |
| `ForbiddenError` | 403 | Not visible to this caller. |

## `bt.judging(eventID, year).review(id).delete()`

Delete a review.

- **Auth:** `judgingAdmin`
- **Route:** `DELETE /judging/{eventID}/{year}/reviews/{id}`

**Output:** object — Deleted.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ReviewNotFoundError` | 404 | No such review. |

