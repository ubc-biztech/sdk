# `judgingRound`

The single global judging round counter. A singleton: `bt.judgingRound.get()`. Note it is global, not per event.

## `bt.judgingRound.get()`

The current round.

- **Auth:** `public`
- **Route:** `GET /team/round`

**Output:** object — Current round.

## `bt.judgingRound.set(input)`

Set the current round. Affects every subsequent `judge.submit`.

- **Auth:** `public`
- **Route:** `PUT /team/round/{round}`

**Input**

| Field | Type | Description |
|---|---|---|
| `round` | string | New round identifier. |

**Output:** object — Confirmation.

