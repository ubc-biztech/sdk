# `judging.team`

One team. `bt.judging(e, y).team(id).update(…)` edits its entry, `.review(…)` scores it.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year).

**Key** (positional arguments of `bt.team(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Team id. |

## `bt.judging(eventID, year).team(id).update(input)`

Replace the team's editable fields. The team's own code may do this while the phase is `submission` and submissions are not locked; admins may at any time.

- **Auth:** `judgingCode`
- **Route:** `PUT /judging/{eventID}/{year}/teams/{id}`

**Input**

| Field | Type | Description |
|---|---|---|
| `name` | string | Team name. |
| `members` | array | Member display names. |
| `description` | string? | Project pitch. |
| `github` | string? | Repository URL. |
| `devpost` | string? | Devpost URL. |
| `imageUrls` | array? | Screenshots, as URLs. |

**Output:** [JudgingTeam](./entities.md#judgingteam) — The updated team, without its code.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |
| `ForbiddenError` | 403 | A team code tried to edit a different team. |
| `SubmissionsClosedError` | 409 | Phase is past `submission`, or `lockSubmissions` is on, or too many images. |

## `bt.judging(eventID, year).team(id).review(input)`

Create or replace the caller's review of this team for the current phase's round. Every rubric criterion must be present and in range; totals are computed by the backend. Only while the phase is `prelim` or `finals`; in finals only finals judges may score finalist teams.

- **Auth:** `judge`
- **Route:** `PUT /judging/{eventID}/{year}/reviews/{id}`

**Input**

| Field | Type | Description |
|---|---|---|
| `scores` | record | Keyed by criterion id. Every criterion, nothing else. |
| `feedback` | string? | Written feedback. |

**Output:** [Review](./entities.md#review) — The stored review with computed totals.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |
| `InvalidScoresError` | 406 | A criterion is missing, extra, or out of range. |
| `PhaseClosedError` | 409 | Judging is not open, or this judge or team is not in the finals. |

## Links

| Call | Via | Description |
|---|---|---|
| `bt.judging(eventID, year).team(id).reviews()` | `judging.reviews.list` | Reviews of this team across rounds. |

