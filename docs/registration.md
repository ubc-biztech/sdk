# `registration`

Registrations. Read-only through the SDK for now; writes still go through the registration form.

## `bt.registrations.list(input)`

Registrations filtered by registrant email and/or event. At least one of `email` or the (`eventID`, `year`) pair is required; the backend rejects an empty query. Non-admins receive only their own.

- **Auth:** `authenticated`
- **Route:** `GET /registrations`

**Input**

| Field | Type | Description |
|---|---|---|
| `email` | string? | Registrant email. Case-insensitive. |
| `eventID` | string? | Event id (slug). Must be paired with `year`. |
| `year` | integer? | Event year. Must be paired with `eventID`. |

**Output:** [Registration](./entities.md#registration)[] — Matching registrations. Empty array when none.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `MissingFilterError` | 406 | Neither email nor eventID+year was given. |

