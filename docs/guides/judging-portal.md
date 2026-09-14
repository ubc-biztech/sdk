# Moving the HelloHacks judging portal onto @ubc-biztech/sdk

The portal (`ubc-biztech/bt-judging`) kept teams, judges, reviews and the rubric in Firestore and compared
login codes in the browser. It now calls the BizTech API through this SDK. This guide records what the
backend looks like and why, for the next app that moves off a personal database.

## The backend

Seven routes in `serverless-biztechapp/services/teams/handlerJudging.ts`, under
`/judging/{eventID}/{year}`. No new tables:

- One row in the judging table per event holds settings, rubric, links, judges and teams. An organizer
  reads it with `admin.get()` and replaces it whole with `admin.set()`.
- One row in the feedback table per review. A judge submits with `team(id).review(…)`; judges and teams
  read with `reviews.list()`, filtered by what their code may see; organizers read everything with
  `admin.reviews()`.
- Teams edit their own entry with `team(id).update(…)` while the phase is `submission`.

Two credentials, never mixed:

| Who | Credential | SDK config | Routes |
|---|---|---|---|
| judge, team | a code the organizer minted, in `X-Judging-Code` | `getCode` | `get`, `team(id).update`, `team(id).review`, `reviews.list` |
| organizer | Cognito ID token of a BizTech exec, in `Authorization` | `getToken` | `admin.get`, `admin.set`, `admin.reviews` |

Codes never leave the server except to organizers: `get()` with a code returns `me`, and a wrong code is a 401.

## What the portal's model became

| Portal (Firestore) | SDK |
|---|---|
| `events/{EVENT_ID}` document | `bt.judging(eventID, year)`; `hellohacks-2027` → `("hellohacks", 2027)` |
| `settings`, `rubric/default`, `links` | fields of the one document, read by `admin.get()` and written by `admin.set()` |
| `teams`, `judges` with codes | lists inside the document; ids and codes minted by the backend on `admin.set()` |
| `reviews` keyed `<teamId>__<judgeId>` | `Review`, id `<round>__<teamId>__<judgeId>`; resubmit replaces |
| auto-assign, finals selection | done in the browser, saved with `admin.set()` |
| admin code | gone. Organizers sign in with their exec account (Cognito), same pool as the main app |
| code scan in the browser | `judgingAs(code).get()` |

## The lessons

- Declare what the backend really returns, then move the app. The compiler catches the mismatch, not a
  judge at the event.
- The whole-document write is last-write-wins. Fine for one organizer; not for two editing at once.
  The portal reads the document fresh right before every write to narrow the window.
- Anything the old app did that the API cannot express (Firebase Storage uploads) got a smaller
  replacement (URLs), recorded in the app's README, rather than a side channel.
- Two credential families on one client is fine as long as the declaration says which one each action
  uses. The runtime never guesses from what is available.
