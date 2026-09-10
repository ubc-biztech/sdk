# Moving the HelloHacks judging portal onto @ubc-biztech/sdk

**Status: done in `ubc-biztech/bt-judging`.** This guide records what was decided and why, for the
next app that moves off a personal database.

The portal kept teams, judges, reviews and the rubric in Firestore and signed people in with codes
compared in the browser. The backend had a different judging model (five fixed metrics, one global round).
Bending the portal onto that would have made it worse. So the portal's own model became the declaration
(`src/ontology/entities/judging.ts`) and the backend service was **generated** from it: this was the first
generated service, and the pilot for collapsing to one description.

## What the portal's model became

| Portal (Firestore) | Declaration | Notes |
|---|---|---|
| `events/{EVENT_ID}` document | `bt.judging(eventID, year)` scope + `settings` singleton | `hellohacks-2027` → `("hellohacks", 2027)` |
| `settings.name / requiredJudgeCount / showTeamFeedback …` | `JudgingSettings` | Field names kept where they existed; `name` → `eventName`, `requiredJudgeCount` → `perTeamJudges` |
| `phase: "submission" \| "judging" \| "closed"` and `"prelim" \| "finals"` | `submission \| prelim \| finals \| closed` | The portal used two vocabularies; the declaration has one |
| `rubric/default` | `rubric` singleton | Criteria with weights; totals computed server-side |
| `teams` | `teams` / `team(id)` | Server-assigned ids and login codes; images are URLs |
| `judges` (with codes, `assignedTeamIds`) | `judges` / `judge(id)` | `isAdmin` grants the organizer role |
| `reviews` keyed `<teamId>__<judgeId>` | `reviews`, id `<round>__<teamId>__<judgeId>` | Resubmit replaces |
| `links` | `links` | |
| code scan in the browser | `session.login({ code })` | Codes never leave the server |

## Auth

Roles `judgingCode`, `judge`, `judgingAdmin` are code roles: the bearer token is a code minted by the
service, resolved by `impl.authenticate`. `judgingAdmin` implies `judge` implies `judgingCode`. Row-level
rules (a team sees only its own reviews; judges see others' only when allowed) live in the implementation,
not the router. A per-stage bootstrap code creates the first organizer.

## Real-time

Firestore listeners became `usePoll` (5 s, paused when hidden). Fine for a judging event; if it is not,
the answer is a subscription capability on the generated service, not a second database.

## The lessons

- Declare reality, then move the app: the declaration was corrected twice while wiring the portal
  (settings fields, phase names). Both were caught by the compiler, not by a judge at the event.
- One description: with the router generated, adding an action makes the backend fail to compile until it
  is implemented, and makes the client's types change in the same commit.
- Anything the old app did that the API cannot express (Firebase Storage uploads) got a smaller
  replacement (URLs), recorded in the app's README, rather than a side channel.
