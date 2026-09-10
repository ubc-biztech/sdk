# `event`

Events. `bt.events` for the collection, `bt.event(id, year)` for one.

**Key** (positional arguments of `bt.event(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Event id (slug). |
| `year` | integer | Event year. |

## `bt.events.list(input)`

All events across all years, sorted by startDate. Public; unpublished events are included, so filter on isPublished for member-facing UI. Returns the overview projection: description and question arrays are absent.

- **Auth:** `public`
- **Route:** `GET /events`

**Input**

| Field | Type | Description |
|---|---|---|
| `id` | string? | Restrict to events with this id (all years). |

**Output:** [Event](./entities.md#event)[] — Events, ascending by startDate.

## `bt.event(id, year).get()`

The full event record.

- **Auth:** `public`
- **Route:** `GET /events/{id}/{year}`

**Output:** [Event](./entities.md#event) — The event.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No event with that id and year. |

## `bt.event(id, year).counts()`

Registration tallies.

- **Auth:** `public`
- **Route:** `GET /events/{id}/{year}` with `?count=true`

**Output:** [EventCounts](./entities.md#eventcounts) — The tallies.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `EventNotFoundError` | 404 | No event with that id and year. |

## Links

| Call | Via | Description |
|---|---|---|
| `bt.event(id, year).registrations()` | `registrations.list` | Every registration for this event, including waitlisted and cancelled. Requires a token. |
| `bt.event(id, year).teams()` | `teams.list` | Every team formed for this event. Requires a token; member emails are only included for admins. |

