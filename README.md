# @ubcbiztech/sdk

Typed, chained client for BizTech club data, **generated from a declared ontology**. One package, one
data plane: every BizTech app (`bt-web`, Relay, the judging portal, companion) reads and writes through
it, and it forwards to `api.ubcbiztech.com`.

```ts
import { createClient } from "@ubcbiztech/sdk";

const bt = createClient({ baseUrl: "https://api-dev.ubcbiztech.com", getToken });

const events = await bt.events.list();
const event  = await bt.event("blueprint", 2026).get();
const teams  = await bt.event("blueprint", 2026).teams();          // a declared link, one call
const round  = await bt.judgingRound.get();
await bt.judge("judge@example.com").submit({ teamID, eventID: "hellohacks", year: 2026, scores });
```

The reasoning behind this design is in the org's `docs/bt-sdk-rfc.md`. The short version: the meaning of our
data used to live in 19 handler files and four hand-rolled clients. Now it lives in `src/ontology/` and
everything else is generated from it.

## Status

**Phase 1, incremental.** The SDK targets the *existing* REST API; nothing in `serverless-biztechapp` changes.
Apps adopt it one call at a time. A contract test runs daily against `api-dev` and fails when the backend
stops matching the declaration, so trust is earned by the test, not asked for.

| Resource | Chain | Covers |
|---|---|---|
| `event` | `bt.events.list()` · `bt.event(id, year).get() / .counts() / .registrations() / .teams()` | events service |
| `registration` | `bt.registrations.list({ email \| eventID+year })` | registrations (read) |
| `me` / `user` | `bt.me.get()` · `bt.user(email).get()` | users |
| `team` | `bt.teams.list/scores/forUser/create/join/leave/rename/addPoints` · `bt.team(id).feedback() / .assignJudges()` | teams |
| `judge` | `bt.judge(email).currentTeam() / .submissions() / .submit() / .updateSubmission()` | judging |
| `judgingRound` | `bt.judgingRound.get() / .set()` | judging |

Full reference: [`docs/`](./docs/README.md) (generated). Migration guides: [`guides/`](./guides).

## Installing

Published to GitHub Packages on every version bump on `main`. Until your app has a registry token, install
straight from git — the package builds itself on install:

```sh
npm i github:ubc-biztech/sdk zod
```

Then in the app: `createClient({ baseUrl, getToken })` once, export it, and replace one fetch at a time.
See [`AGENTS.md`](./AGENTS.md) for the rules and worked calls.

## Layout

```
src/ontology/      the declaration — roles, entities, resources. THE thing to edit.
src/ontology/dsl.ts  the vocabulary it is written in (~240 lines)
src/gen/           the generator: template strings, no AST work (~320 lines)
src/client/        runtime.ts + index.ts are hand-written; generated/ is not
src/check/         semver classification of a declaration diff
docs/              generated reference (wiped and rewritten by `npm run gen`)
guides/            hand-written adoption guides
test/              unit, ontology validation, semver rules, api-dev contract test
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). The loop is: edit `src/ontology/`, `npm run gen`,
`npm test`, `npm run test:contract`, bump the version by what `npm run check:semver` says.
