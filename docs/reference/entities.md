# Entities

## JudgingEvent

Everything about one event's judging except the reviews. One backend row, read and replaced whole.

| Field | Type | Description |
|---|---|---|
| `me` | ref? | The caller. Present on `get` (with a code); absent on the admin actions. |
| `updatedAt` | string | ISO-8601, set by the backend on every write. |
| `settings` | ref | Phase and switches. |
| `rubric` | ref \| null | The rubric, or null before one is set. |
| `links` | array | Home-page links, in order. |
| `judges` | array | Every judge. Codes only on the admin actions. |
| `teams` | array | Every team. Codes only on the admin actions. |

## JudgingInfo

What anyone may see before logging in.

| Field | Type | Description |
|---|---|---|
| `settings` | object | Name and phase only. |
| `links` | array | Home-page links, in order. |

## JudgingSettings

Event phase and switches. Part of JudgingEvent. The backend enforces `phase`, `lockSubmissions`, `maxImages`, `finalsTeamIds`, `finalsJudgeIds`, `showTeamFeedback` and `allowJudgeSeeOthers`; the rest is stored for the portal.

| Field | Type | Description |
|---|---|---|
| `eventName` | string | Display name, e.g. `HelloHacks 2027`. |
| `phase` | enum | `submission`: teams edit their entries. `prelim`: judges score. `finals`: finals judges score finalist teams. `closed`: nothing changes. |
| `finalsTeamIds` | array | Teams in the finals round. Empty until finals are set up. |
| `finalsJudgeIds` | array | Judges who score finals. Empty until finals are set up. |
| `showTeamFeedback` | boolean | Teams may read their own reviews. When false, `reviews.list` with a team code is 403. |
| `allowJudgeSeeOthers` | boolean | Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own. |
| `anonymizeTeams` | boolean | Hide team names from judges. A UI concern; the API still returns names. |
| `lockSubmissions` | boolean | Teams may no longer edit their entries, regardless of phase. |
| `maxImages` | integer | Maximum screenshots per team, enforced on `team.update`. |
| `perTeamJudges` | integer? | How many judges the portal's auto-assign gives each team. Stored, not enforced. |
| `finalsTopN` | integer? | How many prelim teams the portal advances to finals by default. Stored, not enforced. |
| `schedule` | ref? | Prelim presentation schedule. Absent until the portal creates one. |

## JudgingSchedule

Prelim presentation schedule kept by the portal: rooms of judges, timed blocks, and which team presents in which room during which block. Stored inside settings; the backend does not interpret it. The portal derives each judge's `assignedTeamIds` from their room.

| Field | Type | Description |
|---|---|---|
| `rooms` | array | Rooms, in display order. |
| `blocks` | array | Blocks, in time order. |
| `slots` | array | Every scheduled presentation. |
| `changes` | array | Newest first. The portal keeps the last 200. |

## Rubric

What judges score against. Reviews carry one score per criterion; totals are computed from this.

| Field | Type | Description |
|---|---|---|
| `name` | string | Rubric name. |
| `scaleMax` | integer | Highest score on a criterion unless it sets `maxScore`. |
| `scoreMode` | enum | `points`: total is the sum of raw scores. `weighted`: each score is multiplied by its criterion's weight. |
| `criteria` | array | Criteria in display order. |

## JudgingTeam

A team being judged. Lives inside JudgingEvent; logs in to its own pages with `code`.

| Field | Type | Description |
|---|---|---|
| `id` | string | Assigned by the backend. |
| `name` | string | Team name. |
| `members` | array | Member display names. |
| `description` | string? | Project pitch. |
| `github` | string? | Repository URL. |
| `devpost` | string? | Devpost URL. |
| `imageUrls` | array? | Screenshots, as URLs. At most `settings.maxImages`. |
| `code` | string? | Login code for the team's own pages. Only in `admin.get` and `admin.set` responses; minted by the backend when absent. |

## Judge

A judge for one event. No BizTech account; logs in with `code`.

| Field | Type | Description |
|---|---|---|
| `id` | string | Assigned by the backend. |
| `name` | string | Display name, shown on reviews. |
| `assignedTeamIds` | array? | Teams this judge scores in prelims, in order. Chosen by the portal; not enforced by the backend. |
| `code` | string? | Login code. Only in `admin.get` and `admin.set` responses; minted by the backend when absent. |

## JudgingLink

A link on the portal home page (schedule, Discord, rules).

| Field | Type | Description |
|---|---|---|
| `id` | string | Chosen by the portal. |
| `label` | string | Link text. |
| `url` | string | Destination. |

## JudgingPrincipal

Who a code belongs to. Returned as `me` by `judging.get`. Organizers are not principals; they are Cognito admins.

| Field | Type | Description |
|---|---|---|
| `role` | enum | What the code grants. |
| `id` | string | Judge id or team id. |
| `name` | string | Display name. |

## Review

One judge's scores for one team in one round. Resubmitting replaces it.

| Field | Type | Description |
|---|---|---|
| `id` | string | `<round>__<teamId>__<judgeId>`. |
| `round` | enum | Round the review belongs to; the phase at submission. |
| `teamId` | string | JudgingTeam id. |
| `judgeId` | string | Judge id. |
| `judgeName` | string | Judge display name at submission. |
| `scores` | record | Keyed by Rubric.criteria[].id. |
| `feedback` | string | Written feedback. Empty string when none. |
| `total` | number | Sum of raw scores, computed by the backend. |
| `weightedTotal` | number | Sum of score × weight, computed by the backend. |
| `completedAt` | string | ISO-8601. |

