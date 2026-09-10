# `judging.session`

Code login. `bt.judging(e, y).session.login({ code })` returns who the code is; keep the code as the bearer token afterwards.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

## `bt.judging(eventID, year).session.login(input)`

Resolve a code to a role and identity. Public, rate-limited by the gateway. Returns 404 for an unknown code rather than 401 so the response does not distinguish 'wrong code' from 'no such event'.

- **Auth:** `public`
- **Route:** `POST /judging/{eventID}/{year}/session/login`

**Input**

| Field | Type | Description |
|---|---|---|
| `code` | string | The code the person typed. Case-insensitive, whitespace trimmed. |

**Output:** [JudgingSession](./entities.md#judgingsession) — Who the code is.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UnknownCodeError` | 404 | No judge, team or admin code matches. |

## `bt.judging(eventID, year).session.me()`

Who the current bearer code is. Use on page load to restore a session.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/session`

**Output:** [JudgingSession](./entities.md#judgingsession) — The caller.

