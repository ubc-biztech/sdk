# @ubc-biztech/sdk — reference

Generated from the ontology. Every fact here is also in the JSDoc; this is the same information for readers who are not in an editor.

## Roles

| Role | Meaning |
|---|---|
| `public` | No token required. Anyone on the internet. |
| `authenticated` | Any valid Cognito JWT for the environment's user pool. |
| `member` | Authenticated, and the caller's biztechUsers record has isMember === true. |
| `admin` | Today: caller's email ends with @ubcbiztech.com. Intended: Cognito group `admin`. |
| `judgingCode` | Bearer token is any valid code for the event: team, judge or admin. Row-level filtering (a team sees only its own reviews) is the handler's job. |
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
- [`judging.session`](./judging.session.md) — `bt.judging(eventID, year).session.login`, `bt.judging(eventID, year).session.me`
- [`judging.settings`](./judging.settings.md) — `bt.judging(eventID, year).settings.get`, `bt.judging(eventID, year).settings.set`
- [`judging.rubric`](./judging.rubric.md) — `bt.judging(eventID, year).rubric.get`, `bt.judging(eventID, year).rubric.set`
- [`judging.team`](./judging.team.md) — `bt.judging(eventID, year).teams.list`, `bt.judging(eventID, year).teams.create`, `bt.judging(eventID, year).team(id).get`, `bt.judging(eventID, year).team(id).update`, `bt.judging(eventID, year).team(id).delete` · links: `reviews`
- [`judging.judge`](./judging.judge.md) — `bt.judging(eventID, year).judges.list`, `bt.judging(eventID, year).judges.create`, `bt.judging(eventID, year).judges.autoAssign`, `bt.judging(eventID, year).judge(id).get`, `bt.judging(eventID, year).judge(id).update`, `bt.judging(eventID, year).judge(id).delete` · links: `reviews`
- [`judging.review`](./judging.review.md) — `bt.judging(eventID, year).reviews.list`, `bt.judging(eventID, year).reviews.submit`, `bt.judging(eventID, year).review(id).get`, `bt.judging(eventID, year).review(id).delete`
- [`judging.link`](./judging.link.md) — `bt.judging(eventID, year).links.list`, `bt.judging(eventID, year).links.create`, `bt.judging(eventID, year).link(id).delete`
- [Entities](./entities.md)
