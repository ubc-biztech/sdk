# `judging.link`

Home-page links.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

**Key** (positional arguments of `bt.link(…)`)

| Field | Type | Description |
|---|---|---|
| `id` | string | Link id. |

## `bt.judging(eventID, year).links.list()`

All links in order.

- **Auth:** `public`
- **Route:** `GET /judging/{eventID}/{year}/links`

**Output:** [JudgingLink](./entities.md#judginglink)[] — Links by order.

## `bt.judging(eventID, year).links.create(input)`

Add a link.

- **Auth:** `judgingAdmin`
- **Route:** `POST /judging/{eventID}/{year}/links`

**Input**

| Field | Type | Description |
|---|---|---|
| `label` | string | Text. |
| `url` | string | Destination. |
| `order` | integer? | Sort key; default appends. |

**Output:** [JudgingLink](./entities.md#judginglink) — The new link.

## `bt.judging(eventID, year).link(id).delete()`

Remove a link.

- **Auth:** `judgingAdmin`
- **Route:** `DELETE /judging/{eventID}/{year}/links/{id}`

**Output:** object — Deleted.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `LinkNotFoundError` | 404 | No such link. |

