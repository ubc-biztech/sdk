# `judge`

A judge, identified by email. Judges are partner registrations for the event; there is no separate judge record. `bt.judge(email)`.

**Key** (positional arguments of `bt.judge(…)`)

| Field | Type | Description |
|---|---|---|
| `judgeID` | string | Judge's email. |

## `bt.judge(judgeID).currentTeam()`

The team this judge is currently assigned to.

- **Auth:** `public`
- **Route:** `GET /team/judge/currentTeamID/{judgeID}`

**Output:** object — Current assignment.

## `bt.judge(judgeID).submissions()`

Everything this judge has submitted, grouped by round. Note: with no submissions the backend currently returns HTTP 500 or 502 (it throws its 404 inside a try, and API Gateway reports the unhandled throw as 502). Catch ApiError with status >= 500 and treat it as empty until that is fixed.

- **Auth:** `public`
- **Route:** `GET /team/judge/feedback/{judgeID}`

**Output:** object — Submissions by round.

## `bt.judge(judgeID).submit(input)`

Submit scores for a team in the *current* round (the round is read server-side from `bt.judgingRound`). All five metrics must be non-zero; the backend treats 0 as missing. One submission per judge per team per round.

- **Auth:** `public`
- **Route:** `POST /team/judge/feedback`

**Input**

| Field | Type | Description |
|---|---|---|
| `teamID` | string | Team UUID. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |
| `scores` | ref | Five metric scores, all non-zero. |
| `feedback` | json? | Written feedback; string or object keyed by criterion. |

**Output:** object — Confirmation.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `InvalidScoresError` | 400 | A metric is missing or zero. |
| `NotAJudgeError` | 409 | No partner registration for this judge at this event, or already submitted for this team this round. |

## `bt.judge(judgeID).updateSubmission(input)`

Edit an existing submission for a team and round.

- **Auth:** `public`
- **Route:** `PUT /team/judge/feedback`

**Input**

| Field | Type | Description |
|---|---|---|
| `teamID` | string | Team UUID. |
| `round` | string | Round the submission was made in. |
| `scores` | ref? | Replacement scores. |
| `feedback` | json? | Replacement feedback. |
| `judgeName` | string? | Replacement judge display name. |

**Output:** object — Confirmation.

