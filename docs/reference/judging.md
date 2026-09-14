# `judging`

The event's judging as one document. `bt.judging(e, y).info()` before login, `.get()` with a code (which is also login).

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like an event: (eventID, year).

## `bt.judging(eventID, year).info()`

Event name, phase and links, for the landing page before anyone logs in. Sends no credential.

- **Auth:** `public`
- **Route:** `GET /judging/{eventID}/{year}`

**Output:** [JudgingInfo](./entities.md#judginginfo) — Name, phase, links.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No judging has been set up for this event. `admin.set` creates it. |

## `bt.judging(eventID, year).get()`

The whole document as the code may see it, plus `me`. Judge and team codes are never included. This is also login: send the code and a 401 means it is not recognized.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}`

**Output:** [JudgingEvent](./entities.md#judgingevent) — The document, with `me`.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UnknownCodeError` | 401 | The code matches no judge or team of this event (or no judging exists for it yet). |

