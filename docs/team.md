# `team`

Teams at an event. `bt.teams` for collection actions, `bt.team(id)` for judging actions on one team.

**Key** (positional arguments of `bt.team(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Team UUID. |

## `bt.teams.list(input)`

All teams for an event. Member emails (`memberIDs`) are stripped unless the caller is an admin.

- **Auth:** `authenticated`
- **Route:** `GET /team/{eventID}/{year}`

**Input**

| Field | Type | Description |
|---|---|---|
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |

**Output:** [Team](./entities.md#team)[] — Teams for the event.

## `bt.teams.scores()`

Every team's normalized aggregate score for the current judging round. Public. Empty array before any judge has submitted.

- **Auth:** `public`
- **Route:** `GET /team/scores-all`

**Output:** [NormalizedTeamScore](./entities.md#normalizedteamscore)[] — Aggregates, unordered.

## `bt.teams.forUser(input)`

The team a user belongs to at an event.

- **Auth:** `public`
- **Route:** `POST /team/getTeamFromUserID`

**Input**

| Field | Type | Description |
|---|---|---|
| `user_id` | string | Member email. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |

**Output:** object — Wrapper around the team.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | User is not on a team for this event. |

## `bt.teams.create(input)`

Create a team with the given members. Members must be registered for the event.

- **Auth:** `authenticated`
- **Route:** `POST /team/make`

**Input**

| Field | Type | Description |
|---|---|---|
| `team_name` | string | Team name. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |
| `memberIDs` | array | Initial members' emails. |

**Output:** object — Wrapper around the created team.

## `bt.teams.join(input)`

Add a member to an existing team.

- **Auth:** `authenticated`
- **Route:** `POST /team/join`

**Input**

| Field | Type | Description |
|---|---|---|
| `memberID` | string | Joining member's email. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |
| `teamID` | string | Team UUID to join. |

**Output:** object — Confirmation; `response` echoes the input.

## `bt.teams.leave(input)`

Remove a member from their team.

- **Auth:** `authenticated`
- **Route:** `POST /team/leave`

**Input**

| Field | Type | Description |
|---|---|---|
| `memberID` | string | Leaving member's email. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |

**Output:** object — Confirmation; `response` echoes the input.

## `bt.teams.rename(input)`

Rename the team a user belongs to.

- **Auth:** `public`
- **Route:** `POST /team/changeTeamName`

**Input**

| Field | Type | Description |
|---|---|---|
| `user_id` | string | A member's email. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |
| `team_name` | string | New name. |

**Output:** object — Confirmation.

## `bt.teams.addPoints(input)`

Add (or subtract, with a negative number) points to the team a user belongs to.

- **Auth:** `public`
- **Route:** `PUT /team/points`

**Input**

| Field | Type | Description |
|---|---|---|
| `user_id` | string | A member's email. |
| `eventID` | string | Event id (slug). |
| `year` | integer | Event year. |
| `change_points` | integer | Delta. Negative subtracts. |

**Output:** object — New total.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `TeamNotFoundError` | 404 | User is not on a team for this event. |

## `bt.team(id).feedback()`

All judge submissions for this team, grouped by round. Note: when the team has no feedback the backend currently returns HTTP 500 or 502 (it throws its 404 inside a try, and API Gateway reports the unhandled throw as 502). Catch ApiError with status >= 500 and treat it as empty until that is fixed.

- **Auth:** `public`
- **Route:** `GET /team/feedback/{id}`

**Output:** object — Submissions by round.

## `bt.team(id).assignJudges(input)`

Point the given judges at this team for the current round. Judges who already scored this team in this round are skipped.

- **Auth:** `public`
- **Route:** `PUT /team/judge/currentTeam/{id}`

**Input**

| Field | Type | Description |
|---|---|---|
| `judgeIDs` | array | Judges to assign. |

**Output:** object — Confirmation.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `AllJudgesDoneError` | 409 | Every listed judge has already scored this team this round. |

