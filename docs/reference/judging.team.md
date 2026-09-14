# `judging.team`

One team. `bt.judging(e, y).team(id).update(…)` is the team editing its own entry; `.review(…)` is a judge scoring it. Organizers edit teams through `admin.set`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like an event: (eventID, year).

**Key** (positional arguments of `bt.team(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Team id. |

## `bt.judging(eventID, year).team(id).update(input)`

Replace the team's editable fields. Only the team's own code, while the phase is `submission` and submissions are not locked.

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
| `imageUrls` | array? | Screenshots, as URLs. At most `settings.maxImages`. |

**Output:** [JudgingTeam](./entities.md#judgingteam) — The updated team, without its code.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UnknownCodeError` | 401 | The code matches no judge or team of this event (or no judging exists for it yet). |
| `ForbiddenError` | 403 | The code belongs to a different team, or to a judge. |
| `TeamNotFoundError` | 404 | No such team. |
| `InvalidInputError` | 406 | `name` or `members` is missing. |
| `SubmissionsClosedError` | 409 | Phase is past `submission`, `lockSubmissions` is on, or there are more than `maxImages` images. |

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
| `UnknownCodeError` | 401 | The code matches no judge or team of this event (or no judging exists for it yet). |
| `ForbiddenError` | 403 | The code belongs to a team, not a judge. |
| `TeamNotFoundError` | 404 | No such team. |
| `InvalidScoresError` | 406 | A criterion is missing, extra, or out of range. |
| `PhaseClosedError` | 409 | Judging is not open, there is no rubric, or this judge or team is not in the finals. |

## Links

| Call | Via | Description |
|---|---|---|
| `bt.judging(eventID, year).team(id).reviews()` | `judging.reviews.list` | Reviews of this team across rounds, as the code may see them. |

