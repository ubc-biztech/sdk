# `judging.settings`

Event phase and configuration. A singleton per event.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

## `bt.judging(eventID, year).settings.get()`

Current settings. Public so the landing page can show the phase and event name before login.

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
| `eventName` | string | Display name, e.g. `HelloHacks 2027`. |
| `phase` | enum | `submission`: teams edit their entries, no judging. `prelim`: all judges score their assigned teams. `finals`: finals judges score finalist teams. `closed`: nothing changes; results may be shown. |
| `perTeamJudges` | integer | How many judges auto-assign gives each team. |
| `finalsTopN` | integer | How many prelim teams advance to finals by default. |
| `finalsTeamIds` | array | Teams in the finals round. Empty until finals are set up. |
| `finalsJudgeIds` | array | Judges who score finals. Empty until finals are set up. |
| `showTeamFeedback` | boolean | Teams may see their own reviews and the leaderboard. |
| `allowJudgeSeeOthers` | boolean | Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own. |
| `anonymizeTeams` | boolean | Hide team names from judges (UI concern; the API still returns names to judges). |
| `lockSubmissions` | boolean | Teams may no longer edit their entries, regardless of phase. |
| `maxImages` | integer | Maximum screenshots per team. |

**Output:** [JudgingSettings](./entities.md#judgingsettings) — The stored settings.

