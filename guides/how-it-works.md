# How it works, following one call end to end

You do not need to understand this repo to change it. This page exists for the one case where
you want to: it follows a single call all the way through, and then says what you can ignore.

## The call

```ts
const event = await bt.event("blueprint", 2026).get();
```

## 1. The declaration — `src/ontology/entities/event.ts`

```ts
export const events = resource({
  singular: "event", plural: "events",
  key: { id: str({...}), year: int({...}) },          // → bt.event(id, year)
  instance: {
    get: action({                                      // → .get()
      auth: "public",
      output: ref(Event, {...}),
      errors: { EventNotFound: { status: 404, ... } },
      route: { method: "GET", path: "/events/{id}/{year}" },
    }),
  },
});
```

This is the only file a person edits. It is data, not code: builders like `str()` and `action()` just
return objects. `src/ontology/index.ts` lists every resource and entity so the generator can find them.

## 2. Validation — `src/ontology/dsl.ts`, `validate()`

Before anything is generated, `validate()` checks the things TypeScript cannot: that `"public"` is a
declared role, that `{id}` and `{year}` in the path exist as fields, that no description is empty or
`TODO`. Every message names the file and the fix. If validation passes, the declaration is coherent even
if the person who wrote it does not know why.

## 3. Generation — `src/gen/`

`npm run gen` walks the ontology with plain loops and writes three files using template strings:

- `schemas.ts` — `interface Event { ... }` with JSDoc, `EventSchema` (Zod), and for this action
  `EventGetWireSchema` (key + input) and `EventGetOutputSchema`.
- `errors.ts` — `class EventNotFoundError extends BtError`.
- `client.ts` — a `meta` table with one entry per action, and `createClient()` which returns:

```ts
event: (id: string, year: number) => ({
  get: () => rt.call<S.EventGetOutput>(meta["event.get"], { id, year }),
  ...
}),
```

There is no AST manipulation and no DSL; `src/gen/emit.ts` is `out += \`...\`` all the way down. It also
writes `docs/*.md` and `ontology.json` (a snapshot used to classify version bumps).

## 4. The runtime — `src/client/runtime.ts`, `Runtime.call()`

The one hand-written place HTTP happens. In order:

1. Validate `{ id, year }` against `EventGetWireSchema`. Fail → `InputError`, nothing sent.
2. Build the URL: `{id}` and `{year}` are replaced from the input; fields listed in `route.query` become
   the query string; anything left over is the JSON body (never, for GET).
3. Ask `getToken()`. If it returns a token, send `Authorization: Bearer …`. If it returns nothing and
   the action's auth is not `public`, throw `NotAuthenticatedError` before sending.
4. `fetch`. On non-2xx, look the status up in the action's `errors`: 404 → `EventNotFoundError`;
   anything undeclared → `ApiError` with `.status`.
5. Validate the body against `EventGetOutputSchema`. Fail → `ContractViolationError`, which means the
   declaration is wrong about the backend. Undeclared fields are stripped.

## 5. Proof — `test/contract.test.ts`

Daily in CI, and on demand with `npm run check -- --contract`, the same call is made against
`api-dev.ubcbiztech.com` and the response is checked against the declaration. When the backend changes,
this fails and names the action. `test/known-drift.json` lists individual rows on dev that are known
to be malformed, so the test fails only on *new* drift.

## What you can ignore

- **`src/gen/`** unless you are adding a new kind of output. Adding endpoints never touches it.
- **`src/client/runtime.ts`** unless HTTP itself is wrong. Adding endpoints never touches it.
- **`src/check/semver.ts`** entirely. `npm run check` runs it and tells you what version to set.
- **`src/client/generated/`** entirely. Never edit it; it is overwritten.

## What to understand first, if you want to understand one thing

`src/ontology/entities/event.ts`, top to bottom. Every other resource file is the same shape.
