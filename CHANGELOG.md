# Changelog

Versions follow the rule in `scripts/semver.ts`: while the major is 0, a breaking change bumps the
minor. `npm run check` tells you which bump a change needs.

## 0.9.0 — 2026-09-15

- `JudgingSchedule.exclusions` (optional): judge and team pairs removed from the judge's list without
  changing the schedule, for judges who leave early.

## 0.8.0 — 2026-09-15

- `JudgingSchedule.changes[].by` (optional): the organizer's email.

## 0.7.0 — 2026-09-15

- `JudgingSchedule.rooms[].usher` (optional): the room's usher, shown to teams instead of judges.

## 0.6.0 — 2026-09-15

- `JudgingSchedule.activeBlockId` (optional): the block organizers mark as current.

## 0.5.0 — 2026-09-15

- `JudgingSettings.schedule` (optional): rooms of judges, timed blocks, and slots placing a team in a
  room for a block, plus a change log. Kept by bt-judging; the backend stores it verbatim.

## 0.4.1 — 2026-09-13

- Fix: in browsers every call failed with `Illegal invocation`, because `fetch` was invoked with the
  runtime as `this`. It is now bound to `globalThis`.

## 0.4.0 — 2026-09-13

- **Breaking:** the SDK now covers hackathon judging only. The `events`, `users`, `registrations` and
  `teams` declarations were removed; they return one file at a time when an app needs them.
- **Breaking:** two credentials instead of one bearer token. Each role in `roles.ts` names what it
  sends: judge and team actions send `X-Judging-Code` from `ClientConfig.getCode`, organizer actions
  send the Cognito ID token from `ClientConfig.getToken`, public actions send nothing.
- **Breaking:** organizer actions moved under `bt.judging(e, y).admin` (`get`, `set`, `reviews`) to match
  the backend's `/admin` routes. There is no admin code and no `Judge.isAdmin`.
- Layout: `src/resources/<service>/` (the API, one folder per backend service), `src/core/` (machinery),
  `scripts/` (tooling), `docs/reference/` (generated) and `docs/guides/` (hand-written).

## 0.3.0 — 2026-09-12

- Flat `src/` layout; the generated server side was removed. The backend is hand-written in
  serverless-biztechapp and the SDK follows its shape.
- Judging declaration matches the merged backend's document shape.

## 0.2.0 — 2026-09-10

- Scoped resources (`bt.judging(eventID, year).…`) and the first judging declaration.

## 0.1.0 — 2026-09-10

- Initial release: declaration, generator, chained client, contract tests against api-dev.
