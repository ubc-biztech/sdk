# @ubc-biztech/sdk — reference

Generated from the declaration in src/. Every fact here is also in the JSDoc; this is the same information for readers who are not in an editor.

## Roles

| Role | Meaning |
|---|---|
| `public` | No credential. Anyone on the internet. |
| `judgingCode` | Any code the event knows: a team's or a judge's. Row-level filtering (a team sees only its own reviews) is the backend's job. |
| `judge` | A judge's code for the event. A team code gets 403. |
| `admin` | A Cognito ID token for a BizTech exec (today: a verified @ubcbiztech.com email). Not a code. |

## Resources

- [`judging`](./judging.md) — `bt.judging(eventID, year).info`, `bt.judging(eventID, year).get`
- [`judging.admin`](./judging.admin.md) — `bt.judging(eventID, year).admin.get`, `bt.judging(eventID, year).admin.set`, `bt.judging(eventID, year).admin.reviews`
- [`judging.team`](./judging.team.md) — `bt.judging(eventID, year).team(id).update`, `bt.judging(eventID, year).team(id).review` · links: `reviews`
- [`judging.review`](./judging.review.md) — `bt.judging(eventID, year).reviews.list`
- [Entities](./entities.md)
