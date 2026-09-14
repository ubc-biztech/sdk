# How it works, following one call end to end

You do not need to understand this repo to change it. This page exists for the one case where
you want to: it follows a single call all the way through, and then says what you can ignore.

## The call

```ts
const event = await bt.judging("hellohacks", 2027).get();
```

## 1. The declaration — `src/resources/judging/`

```ts
export const judgingScope = { name: "judging", key: { eventID: str({...}), year: int({...}) }, ... };  // → bt.judging(eventID, year)

export const judging = resource({
  singular: "judging",
  scope: judgingScope,                                 // keyless and named after its scope, so it sits on the scope itself
  instance: {
    get: action({                                      // → .get()
      auth: "judgingCode",                             // a role from src/resources/roles.ts; its credential is "code"
      output: ref(JudgingEvent, {...}),
      errors: { UnknownCode: { status: 401, ... } },
      route: { method: "GET", path: "/judging/{eventID}/{year}" },
    }),
  },
});
```

These files are the only ones a person edits. They are data, not code: builders like `str()` and `action()`
just return objects. Each service folder's `index.ts` collects its entities and resources, and
`src/resources/index.ts` imports one line per service so the generator can find them.

## 2. Validation — `src/core/define.ts`, `validate()`

Before anything is generated, `validate()` checks the things TypeScript cannot: that `"judgingCode"` is a
declared role, that `{eventID}` and `{year}` in the path exist as fields, that no description is empty or
`TODO`, that a role only implies roles with the same credential. Every message names the file and the fix.
If validation passes, the declaration is coherent even if the person who wrote it does not know why.

## 3. Generation — `scripts/generate.ts`

`npm run gen` walks the declaration with plain loops and writes three files using template strings:

- `schemas.ts` — `interface JudgingEvent { ... }` with JSDoc, `JudgingEventSchema` (Zod), and for this action
  `JudgingGetWireSchema` (scope key + input) and `JudgingGetOutputSchema`.
- `errors.ts` — `class UnknownCodeError extends BtError`.
- `client.ts` — a `meta` table with one entry per action (route, auth, the role's `credential`, schemas,
  error map), and `createClient()` which returns:

```ts
judging: (eventID: string, year: number) => ({
  get: () => rt.call<S.JudgingGetOutput>(meta["judging.get"], { eventID, year }),
  admin: { get: ..., set: ..., reviews: ... },
  team: (id: string) => ({ update: ..., review: ..., reviews: ... }),
  reviews: { list: ... },
}),
```

There is no AST manipulation; `scripts/generate.ts` is `out += \`...\`` all the way down. It also
writes `docs/reference/*.md` and `api.json` (a snapshot used to classify version bumps).

## 4. The runtime — `src/core/runtime.ts`, `Runtime.call()`

The one hand-written place HTTP happens. In order:

1. Validate `{ eventID, year }` against `JudgingGetWireSchema`. Fail → `InputError`, nothing sent.
2. Build the URL: `{eventID}` and `{year}` are replaced from the input; fields listed in `route.query` become
   the query string; anything left over is the JSON body (never, for GET).
3. Credential, by the action's `credential`: `code` → ask `getCode()` and send `X-Judging-Code`;
   `token` → ask `getToken()` and send `Authorization: Bearer …`; `none` → send nothing. If the getter
   returns nothing, throw `NotAuthenticatedError` before sending.
4. `fetch`. On non-2xx, look the status up in the action's `errors`: 401 → `UnknownCodeError`;
   anything undeclared → `ApiError` with `.status`.
5. Validate the body against `JudgingGetOutputSchema`. Fail → `ContractViolationError`, which means the
   declaration is wrong about the backend. Undeclared fields are stripped.

## 5. Proof — `test/contract.test.ts`

Daily in CI, and on demand with `npm run check -- --contract`, the public call is made against
`api-dev.ubcbiztech.com` and the response is checked against the declaration. With `BT_JUDGING_CODE` or
`BT_ID_TOKEN` set, the code and token calls run too. When the backend changes, this fails and names the
action. `test/known-drift.json` lists individual rows on dev that are known to be malformed, so the test
fails only on *new* drift.

## What you can ignore

- **`scripts/generate.ts`** unless you are adding a new kind of output. Adding endpoints never touches it.
- **`src/core/runtime.ts`** unless HTTP itself is wrong. Adding endpoints never touches it.
- **`scripts/semver.ts`** entirely. `npm run check` runs it and tells you what version to set.
- **`src/generated/`** entirely. Never edit it; it is overwritten.

## What to understand first, if you want to understand one thing

`src/resources/judging/event.ts`, top to bottom, then `entities.ts`. Every other service will be the same shape.
