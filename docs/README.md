# @ubcbiztech/sdk — reference

Generated from the ontology. Every fact here is also in the JSDoc; this is the same information for readers who are not in an editor.

## Roles

| Role | Meaning |
|---|---|
| `public` | No token required. Anyone on the internet. |
| `authenticated` | Any valid Cognito JWT for the environment's user pool. |
| `member` | Authenticated, and the caller's biztechUsers record has isMember === true. |
| `admin` | Today: caller's email ends with @ubcbiztech.com. Intended: Cognito group `admin`. |

## Resources

- [`event`](./event.md) — `bt.events.list`, `bt.event(id, year).get`, `bt.event(id, year).counts` · links: `registrations`, `teams`
- [`registration`](./registration.md) — `bt.registrations.list`
- [`me`](./me.md) — `bt.me.get`
- [`user`](./user.md) — `bt.user(email).get`
- [`team`](./team.md) — `bt.teams.list`, `bt.teams.scores`, `bt.teams.forUser`, `bt.teams.create`, `bt.teams.join`, `bt.teams.leave`, `bt.teams.rename`, `bt.teams.addPoints`, `bt.team(id).feedback`, `bt.team(id).assignJudges`
- [`judge`](./judge.md) — `bt.judge(judgeID).currentTeam`, `bt.judge(judgeID).submissions`, `bt.judge(judgeID).submit`, `bt.judge(judgeID).updateSubmission`
- [`judgingRound`](./judgingRound.md) — `bt.judgingRound.get`, `bt.judgingRound.set`
- [Entities](./entities.md)
