# `judging.judge`

Judges. `bt.judging(e, y).judges.list()`, `bt.judging(e, y).judge(id).get()`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

**Key** (positional arguments of `bt.judge(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Judge id. |

## `bt.judging(eventID, year).judges.list()`

All judges. `code` only for `judgingAdmin`.

- **Auth:** `judge`
- **Route:** `GET /judging/{eventID}/{year}/judges`

**Output:** [Judge](./entities.md#judge)[] — Judges by name.

## `bt.judging(eventID, year).judges.create(input)`

Create a judge. A login code is generated and returned.

- **Auth:** `judgingAdmin`
- **Route:** `POST /judging/{eventID}/{year}/judges`

**Input**

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name. |
| `isAdmin` | boolean? | Also grant the organizer role. Default false. |

**Output:** [Judge](./entities.md#judge) — The new judge, including its code.

## `bt.judging(eventID, year).judges.autoAssign(input)`

Round-robin every team to `perTeamJudges` non-admin judges, replacing all existing prelim assignments.

- **Auth:** `judgingAdmin`
- **Route:** `POST /judging/{eventID}/{year}/judges/auto-assign`

**Input**

| Field | Type | Description |
|---|---|---|
| `perTeamJudges` | integer? | Override JudgingSettings.perTeamJudges for this run. |

**Output:** record — Judge id → team ids.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `NoJudgesError` | 409 | There are no non-admin judges to assign. |

## `bt.judging(eventID, year).judge(id).get()`

One judge. `code` only for `judgingAdmin`.

- **Auth:** `judge`
- **Route:** `GET /judging/{eventID}/{year}/judges/{id}`

**Output:** [Judge](./entities.md#judge) — The judge.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `JudgeNotFoundError` | 404 | No such judge. |

## `bt.judging(eventID, year).judge(id).update(input)`

Rename, toggle admin, or set assignments.

- **Auth:** `judgingAdmin`
- **Route:** `PATCH /judging/{eventID}/{year}/judges/{id}`

**Input**

| Field | Type | Description |
|---|---|---|
| `name` | string? | New name. |
| `isAdmin` | boolean? | Organizer role. |
| `assignedTeamIds` | array? | Replace assignments. |

**Output:** [Judge](./entities.md#judge) — The updated judge.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `JudgeNotFoundError` | 404 | No such judge. |

## `bt.judging(eventID, year).judge(id).delete()`

Delete a judge. Their reviews are kept.

- **Auth:** `judgingAdmin`
- **Route:** `DELETE /judging/{eventID}/{year}/judges/{id}`

**Output:** object — Deleted.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `JudgeNotFoundError` | 404 | No such judge. |

## Links

| Call | Via | Description |
|---|---|---|
| `bt.judging(eventID, year).judge(id).reviews()` | `judging.reviews.list` | Everything this judge has submitted. |

