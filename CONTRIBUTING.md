# Contributing to @ubc-biztech/sdk

You are editing a **declaration**, not an implementation. The client, schemas, error classes and reference
docs are all generated from `src/ontology/`.

## Loop

1. Edit `src/ontology/`. Every field, action, resource and entity needs a `description`; the type system will
   not let you skip it. Write it for someone who has never seen the backend: meaning, unit or format, when absent.
2. `npm run gen` — regenerates `src/client/generated/` and `docs/`.
3. `npm run typecheck && npm test` — unit tests with a fake fetch.
4. `npm run test:contract` — hits `api-dev` and asserts the declaration against reality. If it fails, the
   declaration is wrong, not the test. If a specific row on dev is malformed, record it in
   `test/known-drift.json` with a reason; the test then fails on any *new* drift and on stale entries.
5. `npm run check:semver -- <base ontology.json>` (e.g. `git show main:src/client/generated/ontology.json > /tmp/b.json`)
   and bump `package.json` accordingly. CI enforces this on PRs.

CI runs the generator and fails if committed output is stale. There is no local ritual you can forget.

## Declaring an existing endpoint

```ts
export const judgingRound = resource({
  singular: "judgingRound",                    // bt.judgingRound — no key, so a singleton
  description: "The single global judging round counter.",
  instance: {
    get: action({
      description: "The current round.",
      auth: "public",                          // must be a key of roles.ts
      output: obj({ round: str({ description: "Round identifier, a string on the wire." }) }, { description: "Current round." }),
      route: { method: "GET", path: "/team/round" },   // literal path from the service's serverless.yml
    }),
  },
});
```

- `key` fields become the positional parameters of `bt.<singular>(...)`. Fields named `{like_this}` in `route.path`
  are taken from the key or the input; fields in `route.query` become query params; the rest is the JSON body.
- `links` map this resource's key onto another action's input. A link is one HTTP call, never a loop.
- Declare **reality**, not intent. Call the endpoint on `api-dev` first. If the backend has a bug (returns 500
  for not-found, say), describe the bug in the description rather than declaring the 404 that should exist.
- Do not add a role because an action needs it. Roles are decided in the RFC.
- `route.path` is absolute, no trailing slash. Trailing-slash variants are the bug this project exists to end.
- The generator (`src/gen/`) is meant to be readable in one sitting. If a change to it needs a new
  abstraction, stop and ask; template strings are the design.
