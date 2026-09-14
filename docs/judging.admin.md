# `judging.admin`

Organizer actions, with a Cognito token. `bt.judging(e, y).admin.get()` reads the document with every code, `.set()` replaces it, `.reviews()` lists every review.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like an event: (eventID, year).

## `bt.judging(eventID, year).admin.get()`

The whole document including every judge and team code. No `me`.

- **Auth:** `admin`
- **Route:** `GET /judging/{eventID}/{year}/admin`

**Output:** [JudgingEvent](./entities.md#judgingevent) — The document with every code.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No judging has been set up for this event yet. `set` creates it. |
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |

## `bt.judging(eventID, year).admin.set(input)`

Replace the whole document, creating it if needed. Judges and teams without an `id` or `code` get one minted; pass existing ones back to keep them. The response includes every code. Last write wins.

- **Auth:** `admin`
- **Route:** `PUT /judging/{eventID}/{year}`

**Input**

| Field | Type | Description |
|---|---|---|
| `settings` | ref | Phase and switches. |
| `rubric` | ref \| null? | The rubric. Omit or null for none. |
| `links` | array | Home-page links. |
| `judges` | array | Every judge. |
| `teams` | array | Every team. |

**Output:** [JudgingEvent](./entities.md#judgingevent) — The stored document with every code.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `InvalidInputError` | 406 | A required field is missing, the phase is not one of the four, or two rubric criteria share an id. |
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |

## `bt.judging(eventID, year).admin.reviews(input)`

Every review of the event, newest first, with optional filters.

- **Auth:** `admin`
- **Route:** `GET /judging/{eventID}/{year}/admin/reviews`

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
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |

