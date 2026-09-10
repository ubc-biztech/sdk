# Moving the HelloHacks judging portal onto @ubcbiztech/sdk

The portal (`ubc-biztech/hello-hacks-judging-portal`) keeps teams, judges, reviews and the rubric in
Firestore and signs people in with codes. The BizTech backend already has a judging model in the `teams`
service, and this SDK exposes all of it. This guide maps one to the other so the refactor is mechanical.

## Concept map

| Portal (Firestore) | Backend via SDK | Notes |
|---|---|---|
| `events/{EVENT_ID}` | `bt.event(id, year)` | The portal's `EVENT_ID` becomes an `(id, year)` pair, e.g. `("hellohacks", 2027)`. |
| `teams` collection · `listTeams()` | `bt.event(id, year).teams()` | Requires a token. `memberIDs` only for admins; `teamName`, `submission`, `id` for everyone. |
| `Team.github / devpost / description / imageUrls` | `Team.submission` (one link) and `Team.metadata` | The backend has one `submission` string. Put the rest in `metadata`; declare its shape here when it settles. |
| `judges` collection · `findJudgeByCode()` | *(no equivalent)* | Judges are **partner registrations** (`Registration.isPartner`) identified by email. See "Auth" below. |
| `Judge.assignedTeamIds` | `bt.judge(email).currentTeam()` · `bt.team(teamId).assignJudges({ judgeIDs })` | Backend assigns one *current* team per judge per round rather than a list. Assign the next team after each submission. |
| `reviews` collection · `submitReview()` | `bt.judge(email).submit({ teamID, eventID, year, scores, feedback })` | Scores are `metric1…metric5`. Map the rubric's criteria to metrics in order; all five must be non-zero. |
| `Review.scores` per criterion | `JudgeScores` | Five fixed metrics. If the rubric has fewer, pad with the scale minimum (1); if more, the backend cannot store them today. |
| `Review.total / weightedTotal` | `bt.teams.scores()` | Computed server-side, z-normalized per judge. `teamID` is `"<teamId>;<round>"`. |
| `rubric/default` | *(no equivalent)* | Keep `OFFICIAL_JUDGING_RUBRIC` in the portal. The API stores numbers, not criteria. |
| finals round | `bt.judgingRound.set({ round: "2" })` | The round is one global counter, not per event. |
| `links` collection | *(no equivalent)* | Keep local. |

## Auth

The portal's code-based login has no backend equivalent, and every judging endpoint above is currently
**public** (no Cognito authorizer). That means the refactored portal works today with `createClient({ baseUrl })`
and no `getToken` at all, keeping its existing code gate as the UI-level check. Only `event(...).teams()` needs a
token; for the judge-facing pages, get the team list from `bt.judge(email).currentTeam()` instead, or give
admins a Cognito login.

When the backend adds authorizers to these routes (a Phase 0 item in the RFC), the SDK's `auth:` on each
action changes and this guide gets an update. The portal code will not change: it will need a `getToken`.

## Order of work

1. Add the dependency: `npm i github:ubc-biztech/sdk zod`. Create `src/lib/bt.ts` exporting one client.
2. **Read side first.** Replace `listTeams()` with `bt.event(EVENT.id, EVENT.year).teams()` behind the same
   function signature, so pages do not change. Map `Team` → the portal's `Team` in that one function.
3. Replace the results page with `bt.teams.scores()`.
4. **Then writes.** `submitReview()` → `bt.judge(judgeEmail).submit(...)`. The judge's email comes from the judge
   record you keep locally (code → email).
5. Admin assignment → `bt.team(teamId).assignJudges({ judgeIDs })`, one call per team.
6. Delete `firestore.ts` when nothing imports it.

Each step is contract-tested here before you take it: `npm run test:contract` in this repo exercises every
public judging endpoint against `api-dev`.

## Known backend gaps found while declaring this

- `GET /team/feedback/{teamID}` and `GET /team/judge/feedback/{judgeID}` return **500 or 502** when there is nothing
  to return, because the handler throws its 404 inside a `try` and API Gateway reports the unhandled throw as
  502. The SDK surfaces `ApiError` with status >= 500; treat it as empty. Fix in `services/teams/handler.ts` (`getTeamFeedbackScore`, `getJudgeSubmissions`).
- `judge.submit` rejects a score of `0` as missing (`!data.scores.metric1`). Scales must start at 1.
- The round is global (`ROUND` record in the judging table), so two events cannot be judged at once.
- Every judging write is unauthenticated. Anyone with the URL can set the round or submit scores.
