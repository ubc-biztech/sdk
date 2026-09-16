# `judgingPortal`

Discover judging events and manage the shared landing event.

## `bt.judgingPortal.get()`

Public event names, phases and branding, newest year first. No codes, teams or reviews.

- **Auth:** `public`
- **Route:** `GET /judging`

**Output:** object — Event catalog.

## `bt.judgingPortal.setDefault(input)`

Choose the existing event new visitors see first. Does not modify event data.

- **Auth:** `admin`
- **Route:** `PUT /judging/default`

**Input**

| Field | Type | Description |
|---|---|---|
| `eventID` | string | Lowercase event slug, such as hellohacks. |
| `year` | integer | Event year, from 2000 to 2100. |

**Output:** object — The saved default event.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |
| `InvalidInputError` | 406 | Invalid event name, ID or year. |
| `EventNotFoundError` | 404 | Create the event first. |

## `bt.judgingPortal.create(input)`

Create an empty event in submission phase. Existing events are never replaced. Feedback is initially hidden.

- **Auth:** `admin`
- **Route:** `POST /judging`

**Input**

| Field | Type | Description |
|---|---|---|
| `eventID` | string | Lowercase event slug, such as hellohacks. |
| `year` | integer | Event year, from 2000 to 2100. |
| `eventName` | string | Display name, up to 120 characters. |

**Output:** [JudgingEvent](./entities.md#judgingevent) — The new event.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `ForbiddenError` | 403 | The token is valid but its account is not a BizTech admin. |
| `InvalidInputError` | 406 | Invalid event name, ID or year. |
| `EventExistsError` | 409 | The ID and year already exist; select that event instead. |

