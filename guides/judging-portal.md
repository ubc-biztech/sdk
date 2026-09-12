# Moving the HelloHacks judging portal onto @ubc-biztech/sdk

The portal (`ubc-biztech/bt-judging`) kept teams, judges, reviews and the rubric in Firestore and compared
login codes in the browser. It now calls the BizTech API through this SDK. This guide records what the
backend looks like and why, for the next app that moves off a personal database.

## The backend

Five endpoints in `serverless-biztechapp/services/teams/handlerJudging.ts`, under
`/judging/{eventID}/{year}`. No new tables:

- One row in `bizJudge` per event holds settings, rubric, links, judges and teams. The organizer reads it
  with `get()` and replaces it whole with `set()`.
- One row in `bizFeedback` per review. A judge submits with `team(id).review(…)`; everyone reads with
  `reviews.list()`, filtered by what their code may see.
- Teams edit their own entry with `team(id).update(…)` while the phase is `submission`.

Codes never leave the server: `get()` with a code returns `me`, and a wrong code is a 401.

## What the portal's model became

| Portal (Firestore) | SDK |
|---|---|
| `events/{EVENT_ID}` document | `bt.judging(eventID, year)`; `hellohacks-2027` → `("hellohacks", 2027)` |
| `settings`, `rubric/default`, `links` | fields of the one document, read by `get()` and written by `set()` |
| `teams`, `judges` with codes | lists inside the document; ids and codes minted by the backend on `set()` |
| `reviews` keyed `<teamId>__<judgeId>` | `Review`, id `<round>__<teamId>__<judgeId>`; resubmit replaces |
| auto-assign, finals selection | done in the browser, saved with `set()` |
| code scan in the browser | `judgingAs(code).get()` |

## The lessons

- Declare what the backend really returns, then move the app. The compiler catches the mismatch, not a
  judge at the event.
- The whole-document write is last-write-wins. Fine for one organizer; not for two editing at once.
- Anything the old app did that the API cannot express (Firebase Storage uploads) got a smaller
  replacement (URLs), recorded in the app's README, rather than a side channel.
