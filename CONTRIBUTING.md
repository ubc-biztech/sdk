# Contributing

## The premise

This repo will outlive everyone who understands it. BizTech turns over its exec every year, so the
realistic maintainer is someone with a partial and partly wrong idea of how it works, probably working
with a coding agent. The repo is designed for that person:

- **One file per change.** Adding or fixing an endpoint touches one file in `src/ontology/entities/`.
  Nothing else needs to be understood, opened, or edited.
- **Wrong guesses are cheap.** Every mistake is caught by a machine that says which file and what to
  change. Nothing here can touch production; the contract test is read-only against `api-dev`.
- **One command says whether you are done.** `npm run check`. Green means commit.

If you find yourself needing to understand `src/gen/` or `src/client/runtime.ts` to add an endpoint,
that is a bug in this repo. Say so in an issue.

## Recipes

### Add an endpoint the SDK does not cover yet

```sh
npm run new -- sticker stickers        # singular, then plural (omit plural for a singleton like judgingRound)
```

This creates `src/ontology/entities/sticker.ts` full of `TODO`s and registers it. Then:

1. Call the endpoint on `https://api-dev.ubcbiztech.com` (curl, browser, anything) and look at the
   real response. Find its path and method in `serverless-biztechapp/services/<service>/serverless.yml`.
2. Replace every `TODO`. Declare what the endpoint **really** returns, not what it should. If it returns
   500 for not-found, say so in the description instead of declaring a 404.
3. `npm run check`. It lists what is still wrong and where. Repeat until green.
4. `npm run check -- --contract` to prove it against `api-dev` (public endpoints only, without a token).
5. Commit `src/ontology/`, `src/client/generated/`, `docs/`, and `package.json` together.

### Add an action to an existing resource

Open the resource's file, copy the nearest `action({...})` block, change the description, route, input,
output and errors. `npm run check`.

### Add a field the backend already returns

Open the entity, add one line inside `fields:`, with a description. `npm run check`. If the field is
sometimes absent, add `optional: true`; if it is sometimes `null`, add `nullable: true`.

### The contract test failed

The failing assertion names the action. The backend now returns something different from the
declaration. Look at the real response and change the declaration to match. If exactly one row on dev
is malformed (a test fixture, say), record it in `test/known-drift.json` with a reason and a date
instead; the test then fails only on new drift, and fails again if the entry goes stale.

### `npm run check` says to bump the version

Do what it says: `major` = first number up, `minor` = second number up, reset the rest to `0`. The
rule is mechanical and lives in `src/check/semver.ts`; you never need to read it.

### Something else

`guides/how-it-works.md` follows one call end to end and says which files you can ignore.

## The vocabulary, in one screen

```ts
entity({ name, description, fields: { id: str({ description }) , ... } })
resource({
  singular, plural?, entity?, description,
  key:        { id: str({...}) },                 // positional args of bt.<singular>(...)
  collection: { list: action({...}) },            // bt.<plural>.list()
  instance:   { get: action({...}) },             // bt.<singular>(id).get()
  links:      { things: link({ via: "things.list", map: { ownerId: "id" }, description }) },
})
action({ description, auth, input?, output, errors?, route: { method, path, query?, fixedQuery? } })
```

Field builders: `str int num bool json oneOf(values) list(items) obj(fields) record(values) ref(Entity)`,
each taking `{ description, optional?, nullable? }`. `auth` is one of the keys in `src/ontology/roles.ts`.
Fields named `{like_this}` in `route.path` come from the key or input; `route.query` names query params;
the rest is the JSON body.

## Rules that the machine does not enforce

- `route.path` is the literal path from `serverless.yml`. Never invent one. Never add a trailing slash.
- Do not add a role to `roles.ts` because an action needs it. Roles are decided in the RFC.
- The generator (`src/gen/`) is template strings and must stay readable in one sitting. A test fails if
  it passes 500 lines. If a change needs a new abstraction there, stop and ask.
