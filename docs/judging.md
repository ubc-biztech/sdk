# `judging`

The event's judging as one document. `bt.judging(e, y).get()` reads it and logs in; `.set()` replaces it.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year).

## `bt.judging(eventID, year).info()`

Event name, phase and links, for the landing page before anyone logs in.

- **Auth:** `public`
- **Route:** `GET /judging/{eventID}/{year}`

**Output:** [JudgingInfo](./entities.md#judginginfo) — Name, phase, links.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No judging has been set up for this event. `set` creates it. |

## `bt.judging(eventID, year).get()`

The whole document as the bearer code may see it, plus `me`. Judge and team codes are included only for admins. This is also login: send the code and a 401 means it is not recognized.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}`

**Output:** [JudgingEvent](./entities.md#judgingevent) — The document, with `me`.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UnknownCodeError` | 401 | No judge, team or organizer code matches. |
| `EventNotFoundError` | 404 | The code is the organizer code but no judging exists for this event yet. |

## `bt.judging(eventID, year).set(input)`

Replace the whole document, creating it if needed. Judges and teams without an `id` or `code` get one minted. The response includes every code. Last write wins.

- **Auth:** `judgingAdmin`
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

