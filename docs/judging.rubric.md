# `judging.rubric`

The event's rubric. A singleton per event.

Scoped under `bt.judging(eventID, year)`: One event's judging. Keyed like Event: (eventID, year). Served by the generated `judging` service.

## `bt.judging(eventID, year).rubric.get()`

The rubric. Judges need it to score; teams need it to read feedback.

- **Auth:** `judgingCode`
- **Route:** `GET /judging/{eventID}/{year}/rubric`

**Output:** [Rubric](./entities.md#rubric) — The rubric.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `RubricNotFoundError` | 404 | No rubric set yet. |

## `bt.judging(eventID, year).rubric.set(input)`

Create or replace the rubric. Existing reviews keep their scores keyed by old criterion ids; totals are not recomputed.

- **Auth:** `judgingAdmin`
- **Route:** `PUT /judging/{eventID}/{year}/rubric`

**Input**

| Field | Type | Description |
|---|---|---|
| `name` | string | Rubric name. |
| `scaleMax` | integer | Max per criterion. |
| `scoreMode` | enum | Total mode. |
| `criteria` | array | Criteria in order. At least one. |

**Output:** [Rubric](./entities.md#rubric) — The stored rubric.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `InvalidRubricError` | 400 | No criteria, duplicate criterion ids, or a non-positive scale. |

