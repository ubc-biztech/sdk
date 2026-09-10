# Entities

## Event

A BizTech event. Identified by the pair (id, year): the same id recurs across years, e.g. `blueprint` 2024 and 2025. Stored in biztechEvents<stage>.

Storage: table `biztechEvents`, pk `id`, sk `year`.

| Field | Type | Description |
|---|---|---|
| `id` | string | URL slug, unique within a year. Lower-case, no spaces. |
| `year` | integer | Calendar year of the event. Together with `id` this is the primary key. |
| `ename` | string | Display name. |
| `description` | string? | Long-form description shown on the event page. Markdown-ish free text. |
| `partnerDescription` | string? | Description shown to partner/company attendees. |
| `elocation` | string? | Human-readable venue. |
| `startDate` | string | ISO-8601 timestamp, UTC. |
| `endDate` | string | ISO-8601 timestamp, UTC. |
| `deadline` | string? | Registration deadline, ISO-8601 UTC. Registration is closed after this. |
| `capac` | integer | Capacity. Registrations beyond this are waitlisted. |
| `imageUrl` | string? | Thumbnail/hero image URL. |
| `isPublished` | boolean | Visible to members. Unpublished events are only visible to admins. |
| `isCompleted` | boolean? | Event has happened; used to move it to the past-events list. |
| `isApplicationBased` | boolean? | Registrations are applications that an admin accepts or rejects, rather than first-come. |
| `nonBizTechAllowed` | boolean? | Non-members may register. |
| `pricing` | object? | Ticket prices in CAD. |
| `registrationQuestions` | array? | Custom registration form for attendees. |
| `partnerRegistrationQuestions` | json? | Same shape as registrationQuestions, for partners. Declared loosely until it is used through the SDK. |
| `feedback` | string? | Legacy feedback-form link. Superseded by attendeeFeedbackQuestions. |
| `attendeeFeedbackEnabled` | boolean? | Attendee feedback form is open. |
| `partnerFeedbackEnabled` | boolean? | Partner feedback form is open. |
| `createdAt` | integer | Epoch milliseconds. |
| `updatedAt` | integer? | Epoch milliseconds. |

## EventCounts

Registration tallies for one event, as returned by `GET /events/{id}/{year}?count=true`.

| Field | Type | Description |
|---|---|---|
| `registeredCount` | integer | Registrations with status registered. |
| `checkedInCount` | integer | Registrations that have checked in. |
| `waitlistCount` | integer | Registrations on the waitlist. |
| `dynamicCounts` | json? | Per-question answer tallies, keyed by questionId. Shape varies by question type. |

## Registration

One user's registration for one event. Keyed by the user's email (`id`) and the composite `eventID;year` string, which is the literal attribute name in DynamoDB.

Storage: table `biztechRegistrations`, pk `id`, sk `eventID;year`.

| Field | Type | Description |
|---|---|---|
| `id` | string | Registrant's email, lower-case. Joins to User.id. |
| `eventID;year` | string | Composite key `<eventId>;<year>`, e.g. `blueprint;2026`. Yes, the semicolon is in the attribute name. |
| `fname` | string? | First name at registration time. |
| `registrationStatus` | string | One of registered, checkedIn, waitlist, cancelled, incomplete. Free string on the wire; not enforced server-side. |
| `applicationStatus` | string? | For application-based events: accepted, rejected, reviewing, waitlist. |
| `isPartner` | boolean? | Registered through the partner/company flow. Judges are partner registrations. |
| `basicInformation` | json? | Name, year, faculty, diet, etc. Shape differs for attendee vs partner; declared loosely for now. |
| `dynamicResponses` | json? | Answers keyed by Event.registrationQuestions[].questionId. |
| `points` | integer? | Gamification points earned at the event. |
| `scannedQRs` | array? | QR codes this registrant has scanned. |
| `studentId` | string? | UBC student number as entered. |
| `checkoutLink` | string? | Stripe checkout URL while payment is pending. |
| `createdAt` | integer? | Epoch milliseconds. |
| `updatedAt` | integer? | Epoch milliseconds. |

## User

A BizTech account, keyed by email. Created on first sign-in. Membership is a paid annual flag on this record.

Storage: table `biztechUsers`, pk `id`.

| Field | Type | Description |
|---|---|---|
| `id` | string | Email, lower-case. Primary key. |
| `fname` | string? | First name. |
| `lname` | string? | Last name. |
| `studentId` | string? | UBC student number. |
| `faculty` | string? | Faculty as entered. |
| `major` | string? | Major as entered. |
| `year` | string? | Study year as entered, e.g. `3rd Year`. Free text. |
| `isMember` | boolean? | Has an active paid membership. This is the docs' `member` role. |
| `admin` | boolean? | Set at creation from the email domain. Not read for authorization anywhere today. |
| `favedEventsID` | json? | Array of `eventId;year` strings the user favourited. |
| `createdAt` | integer? | Epoch milliseconds. |
| `updatedAt` | integer? | Epoch milliseconds. |

## Team

A team of registrants at one event (hackathons, case comps). Keyed by a UUID and the composite `eventID;year`. Stored in biztechTeams<stage>.

Storage: table `biztechTeams`, pk `id`, sk `eventID;year`.

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID. |
| `teamName` | string | Display name, chosen by the team. |
| `eventID;year` | string | Composite key `<eventId>;<year>`. |
| `memberIDs` | array? | Member emails. Omitted from `teams.list` for non-admin callers. |
| `memberNames` | array? | Member first names, parallel to memberIDs when present. |
| `scannedQRs` | array? | QR codes any member has scanned. |
| `points` | integer? | Points earned. |
| `pointsSpent` | integer? | Points spent in the event store. |
| `transactions` | array? | Store transaction ids. |
| `inventory` | array? | Items bought. |
| `submission` | string? | Submission link (Devpost, GitHub, …). Empty string when none. |
| `metadata` | json? | Free-form per-event data. |
| `funding` | number? | BTX funding, if applicable. |

## JudgeScores

A judge's five metric scores for one team in one round. The backend has exactly five numbered metrics; what each means is defined by the event's rubric, not the API.

| Field | Type | Description |
|---|---|---|
| `metric1` | number | Score for rubric criterion 1. |
| `metric2` | number | Score for rubric criterion 2. |
| `metric3` | number | Score for rubric criterion 3. |
| `metric4` | number | Score for rubric criterion 4. |
| `metric5` | number | Score for rubric criterion 5. |

## JudgeSubmission

One judge's scores and feedback for one team in one round, as returned by the feedback endpoints.

| Field | Type | Description |
|---|---|---|
| `judgeID` | string | Judge's email. Judges are partner registrations (`Registration.isPartner`). |
| `judgeName` | string? | Judge display name, if set at submission. |
| `scores` | ref? | The five metric scores. |
| `feedback` | json? | Written feedback. A string or an object keyed by criterion; both occur. |
| `createdAt` | string? | ISO-8601 timestamp of submission. |
| `teamName` | string? | Team name at submission time. |

## NormalizedTeamScore

A team's aggregate for the current round, with judge scores z-normalized so a harsh judge and a generous judge count equally.

| Field | Type | Description |
|---|---|---|
| `teamID` | string | `<teamId>;<round>` — the composite feedback key, NOT the bare team id. Split on `;` to get the team. |
| `teamName` | string | Team name. |
| `zScoreWeighted` | number | Weighted mean of z-scored metrics across judges. Higher is better. |
| `judges` | array | Judges who scored this team. |
| `originalResponses` | array | Raw per-judge scores before normalization. |

## JudgingSettings

Per-event judging configuration and phase. One record per event.

| Field | Type | Description |
|---|---|---|
| `eventName` | string | Display name, e.g. `HelloHacks 2027`. |
| `phase` | enum | `submission`: teams edit their entries, no judging. `prelim`: all judges score their assigned teams. `finals`: finals judges score finalist teams. `closed`: nothing changes; results may be shown. |
| `perTeamJudges` | integer | How many judges auto-assign gives each team. |
| `finalsTopN` | integer | How many prelim teams advance to finals by default. |
| `finalsTeamIds` | array | Teams in the finals round. Empty until finals are set up. |
| `finalsJudgeIds` | array | Judges who score finals. Empty until finals are set up. |
| `showTeamFeedback` | boolean | Teams may see their own reviews and the leaderboard. |
| `allowJudgeSeeOthers` | boolean | Judges may read other judges' reviews. When false, `reviews.list` returns a judge only their own. |
| `anonymizeTeams` | boolean | Hide team names from judges (UI concern; the API still returns names to judges). |
| `lockSubmissions` | boolean | Teams may no longer edit their entries, regardless of phase. |
| `maxImages` | integer | Maximum screenshots per team. |
| `updatedAt` | string | ISO-8601. |

## Rubric

The scoring rubric for an event. Reviews are scored per criterion against this; totals are computed from it.

| Field | Type | Description |
|---|---|---|
| `name` | string | Rubric name. |
| `scaleMax` | integer | Highest score on each criterion, e.g. 5 or 10. |
| `scoreMode` | enum | `points`: total is the sum of raw scores. `weighted`: each criterion is multiplied by its weight. |
| `criteria` | array | Criteria in display order. |
| `updatedAt` | string | ISO-8601. |

## JudgingTeam

A team being judged. Independent of the `Team` entity used by the main app; hackathon teams are created by organizers or self-registered with a code.

| Field | Type | Description |
|---|---|---|
| `id` | string | ULID, assigned on create. |
| `name` | string | Team name. |
| `members` | array | Member display names. |
| `description` | string? | Project pitch. Markdown-ish. |
| `github` | string? | Repository URL. |
| `devpost` | string? | Devpost URL. |
| `imageUrls` | array | Screenshots. URLs only; upload is the client's concern for now. |
| `code` | string? | Login code for the team's own feedback page. Only returned to `judgingAdmin`. |
| `createdAt` | string | ISO-8601. |

## Judge

A judge for one event. Has no BizTech account; logs in with `code`.

| Field | Type | Description |
|---|---|---|
| `id` | string | ULID, assigned on create. |
| `name` | string | Display name, shown on reviews. |
| `code` | string? | Login code. Only returned to `judgingAdmin`. |
| `isAdmin` | boolean | This judge's code also grants `judgingAdmin`. |
| `assignedTeamIds` | array | Teams this judge scores in prelims, in order. |

## Review

One judge's scores for one team in one round. Id is deterministic (`<round>__<teamId>__<judgeId>`) so a resubmit replaces rather than duplicates.

| Field | Type | Description |
|---|---|---|
| `id` | string | `<round>__<teamId>__<judgeId>`. |
| `round` | enum | Round the review belongs to. |
| `teamId` | string | JudgingTeam id. |
| `judgeId` | string | Judge id. |
| `judgeName` | string | Judge display name at submission. |
| `scores` | record | Keyed by Rubric.criteria[].id. |
| `feedback` | string | Written feedback. Empty string when none. |
| `total` | number | Sum of raw scores, computed server-side from the rubric at submission. |
| `weightedTotal` | number | Sum of score × weight, computed server-side. |
| `completedAt` | string | ISO-8601. |

## JudgingLink

A link shown on the portal home page (schedule, Discord, rules).

| Field | Type | Description |
|---|---|---|
| `id` | string | ULID. |
| `label` | string | Link text. |
| `url` | string | Destination. |
| `order` | integer | Sort key, ascending. |

## JudgingSession

Who a code belongs to. Returned by `session.login`; the code itself is then used as the bearer token.

| Field | Type | Description |
|---|---|---|
| `role` | enum | What the code grants. |
| `id` | string | Judge id or team id. For `judgingAdmin` codes that are not also a judge, the string `admin`. |
| `name` | string | Display name. |
| `eventName` | string | From JudgingSettings, so the client can render a header without a second call. |

