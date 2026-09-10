# `judging.settings`

Event phase and configuration. A singleton per event.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

## `bt.judging(eventID, year).settings.get()`

Current settings. Public so the landing page can show the phase before login. `finalsJudgeIds` and `finalsTeamIds` are included.

- **Auth:** `public`
- **Route:** `GET /judging/{eventID}/{year}/settings`

**Output:** [JudgingSettings](./entities.md#judgingsettings) — The settings.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No judging has been set up for this event. `settings.set` creates it. |

## `bt.judging(eventID, year).settings.set(input)`

Create or replace settings. Creating is how an event's judging is initialized; the admin code is set out-of-band (see the service README).

- **Auth:** `judgingAdmin`
- **Route:** `PUT /judging/{eventID}/{year}/settings`

**Input**

| Field | Type | Description |
|---|---|---|
| `eventName` | string | Display name. |
| `phase` | enum | Phase. |
| `perTeamJudges` | integer | Judges per team for auto-assign. |
| `finalsTopN` | integer | Default number of finalists. |
| `finalsTeamIds` | array | Finalist teams. |
| `finalsJudgeIds` | array | Finals judges. |
| `resultsPublic` | boolean | Teams may see results. |

**Output:** [JudgingSettings](./entities.md#judgingsettings) — The stored settings.

