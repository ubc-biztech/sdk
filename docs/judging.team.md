# `judging.team`

Teams being judged. `bt.judging(e, y).teams.list()`, `bt.judging(e, y).team(id).get()`.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

**Key** (positional arguments of `bt.team(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Team id. |

## `bt.judging(eventID, year).teams.list()`

All teams, sorted by name. `code` is included only for `judgingAdmin` callers.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/teams`

**Output:** [JudgingTeam](./entities.md#judgingteam)[] — Teams by name.

## `bt.judging(eventID, year).teams.create(input)`

Create a team. A login code is generated and returned.

- **Auth:** `judgingAdmin`
- **Route:** `POST /judging/{eventID}/{year}/teams`

**Input**

| Field | Type | Description |
|---|---|---|
| `name` | string | Team name. |
| `members` | array | Member display names. |
| `description` | string? | Project pitch. |
| `github` | string? | Repository URL. |
| `devpost` | string? | Devpost URL. |
| `imageUrls` | array? | Screenshots. |

**Output:** [JudgingTeam](./entities.md#judgingteam) — The new team, including its code.

## `bt.judging(eventID, year).team(id).get()`

One team. `code` only for `judgingAdmin`.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/teams/{id}`

**Output:** [JudgingTeam](./entities.md#judgingteam) — The team.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |

## `bt.judging(eventID, year).team(id).update(input)`

Replace the editable fields. A team's own code may update its own team while the phase is `submission` and submissions are not locked; admins may update any team at any time.

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
| `imageUrls` | array? | Screenshots. |

**Output:** [JudgingTeam](./entities.md#judgingteam) — The updated team.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |
| `ForbiddenError` | 403 | A team code tried to edit a different team. |
| `SubmissionsLockedError` | 409 | Phase is past `submission` or `lockSubmissions` is on. |

## `bt.judging(eventID, year).team(id).delete()`

Delete a team and its reviews.

- **Auth:** `judgingAdmin`
- **Route:** `DELETE /judging/{eventID}/{year}/teams/{id}`

**Output:** object — Deleted.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | No such team. |

## Links

| Call | Via | Description |
|---|---|---|
| `bt.judging(eventID, year).team(id).reviews()` | `judging.reviews.list` | Reviews of this team across rounds. Team codes see them only when results are public. |

