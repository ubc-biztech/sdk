# @ubc-biztech/sdk — reference

Generated from the declaration in src/. Every fact here is also in the JSDoc; this is the same information for readers who are not in an editor.

## Roles

| Role | Meaning |
|---|---|
| `public` | No token required. Anyone on the internet. |
| `authenticated` | Any valid Cognito JWT for the environment's user pool. |
| `member` | Authenticated, and the caller's biztechUsers record has isMember === true. |
| `admin` | Today: caller's email ends with @ubcbiztech.com. Intended: Cognito group `admin`. |
| `judgingCode` | Bearer token is any valid code for the event: team, judge or admin. Row-level filtering (a team sees only its own reviews) is the backend's job. |
| `judge` | Bearer token is a judge code for the event. |
| `judgingAdmin` | Bearer token is the event's organizer code. |

## Resources

- [`event`](./event.md) — `bt.events.list`, `bt.event(id, year).get`, `bt.event(id, year).counts` · links: `registrations`, `teams`
- [`registration`](./registration.md) — `bt.registrations.list`
- [`me`](./me.md) — `bt.me.get`
- [`user`](./user.md) — `bt.user(email).get`
- [`team`](./team.md) — `bt.teams.list`, `bt.teams.scores`, `bt.teams.forUser`, `bt.teams.create`, `bt.teams.join`, `bt.teams.leave`, `bt.teams.rename`, `bt.teams.addPoints`, `bt.team(id).feedback`, `bt.team(id).assignJudges`
- [`legacyJudge`](./legacyJudge.md) — `bt.legacyJudge(judgeID).currentTeam`, `bt.legacyJudge(judgeID).submissions`, `bt.legacyJudge(judgeID).submit`, `bt.legacyJudge(judgeID).updateSubmission`
- [`judgingRound`](./judgingRound.md) — `bt.judgingRound.get`, `bt.judgingRound.set`
- [`judging`](./judging.md) — `bt.judging(eventID, year).info`, `bt.judging(eventID, year).get`, `bt.judging(eventID, year).set`
- [`judging.team`](./judging.team.md) — `bt.judging(eventID, year).team(id).update`, `bt.judging(eventID, year).team(id).review` · links: `reviews`
- [`judging.review`](./judging.review.md) — `bt.judging(eventID, year).reviews.list`
- [Entities](./entities.md)
