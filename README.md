# @ubc-biztech/sdk

Typed client for the BizTech API. One call per method, one HTTP request per call. Everything
below is generated from one declaration, so the types, the error classes and the JSDoc on every
method agree with each other by construction.

Today the SDK covers **hackathon judging** (the `bt-judging` portal). Other services come back one
declaration file at a time; see [Changing the SDK](#changing-the-sdk).

## Install

```sh
npm i github:ubc-biztech/sdk zod
```

Once the org's GitHub Packages registry is enabled, `npm i @ubc-biztech/sdk` works with a scoped
`.npmrc` entry. Until then the git install builds the package on install.

## Create a client

One client per app, at startup. Export it and import it everywhere.

```ts
// src/lib/bt.ts
import { createClient } from "@ubc-biztech/sdk";

export const bt = createClient({
  baseUrl: process.env.NEXT_PUBLIC_STAGE === "production"
    ? "https://api.ubcbiztech.com"
    : "https://api-dev.ubcbiztech.com",
  // The signed-in judge's or team's code, or null. Sent as X-Judging-Code.
  getCode: () => getSession()?.code ?? null,
  // The organizer's Cognito ID token, or null. Sent as Authorization: Bearer.
  getToken: async () => (await fetchAuthSession()).tokens?.idToken?.toString() ?? null,
});
```

| Option | Type | Notes |
|---|---|---|
| `baseUrl` | `string` | No trailing slash. |
| `getCode` | `() => string \| null \| Promise<…>` | Called on every `judgingCode` / `judge` action. Returning null throws `NotAuthenticatedError` before any HTTP. |
| `getToken` | `() => string \| null \| Promise<…>` | Called on every `admin` action. Same rule. |
| `fetch` | `typeof fetch` | Override for tests or non-browser runtimes. |
| `validateOutput` | `boolean` | Default `true`. Set `false` only in an emergency during a live event, then file the drift. |

Public actions send neither credential. Each method's JSDoc says which one it needs.

## How calls are shaped

```ts
bt.judging(eventID, year).<action>(input)           // the event:     bt.judging("hellohacks", 2027).get()
bt.judging(eventID, year).admin.<action>(input)     // organizer:     ….admin.set(doc)
bt.judging(eventID, year).team(id).<action>(input)  // one team:      ….team(id).review({ scores })
bt.judging(eventID, year).reviews.list(input)       // collection:    ….reviews.list({ round: "prelim" })
```

Every method returns a `Promise` of a typed value. Input is validated before sending; output is
validated after, and fields the declaration does not include are stripped.

## Reference

Full per-method reference with input and output tables: [`docs/reference/`](./docs/reference/README.md).

### Hackathon judging

One event's judging is one document on the backend: settings, rubric, links, judges and teams.
Reviews are separate rows. Two kinds of caller:

- **Judges and teams** have no BizTech account. An organizer mints them a **code**; the code goes in
  `X-Judging-Code` on every call.
- **Organizers** sign in with their BizTech exec account. Their calls live under `.admin` and send the
  Cognito ID token. A code never works on an admin call and a token never works on a code call.

```ts
const j = bt.judging("hellohacks", 2027);

// Before login (no credential)
const info = await j.info();   // { settings: { eventName, phase }, links }; EventNotFoundError until an organizer sets it up

// With a code. This is also login: UnknownCodeError (401) means the code is wrong.
const event = await j.get();   // settings, rubric, links, judges, teams (no codes), and `me`: { role: "judge" | "team", id, name }

await j.team(teamId).update({ name, members, description, github, devpost, imageUrls }); // the team itself, during `submission`
await j.team(teamId).review({ scores: { design: 4, impact: 5 }, feedback: "…" });       // a judge; totals computed server-side
const mine = await j.reviews.list({ round: "prelim" });                                   // filtered by what the code may see

// Organizer (Cognito token). The event is one document: read it whole, replace it whole.
const doc = await j.admin.get();                                                          // every judge and team code included
await j.admin.set({ ...doc, settings: { ...doc.settings, phase: "finals" } });            // new judges/teams get ids and codes minted
const all = await j.admin.reviews();                                                      // every review
```

Anything the API does not do (auto-assigning judges, picking finalists) is done in the app and saved
with `admin.set`. The write is last-write-wins; fine for one organizer at a time.

## Errors

Every failure is a thrown class. Branch on `instanceof`, never on a status number pulled from an object.

| Class | When |
|---|---|
| `EventNotFoundError`, `UnknownCodeError`, `ForbiddenError`, `TeamNotFoundError`, `PhaseClosedError`, `SubmissionsClosedError`, `InvalidScoresError`, `InvalidInputError` | A status the action declares. See each method's JSDoc, or `docs/`. |
| `ApiError` | Any other non-2xx. Has `.status`, `.action`, `.details`. |
| `NotAuthenticatedError` | Action needs a code or token and the getter returned null. Thrown before any HTTP. |
| `InputError` | Your input failed the declared schema. Thrown before any HTTP. `.details` has the issues. |
| `ContractViolationError` | The backend returned something the declaration does not describe. Do not catch this; report it. |

```ts
import { UnknownCodeError, ApiError } from "@ubc-biztech/sdk";

try {
  return await bt.judging(id, year).get();
} catch (e) {
  if (e instanceof UnknownCodeError) return badCode();
  if (e instanceof ApiError && e.status >= 500) return retryLater();
  throw e;
}
```

## Types

Every entity and every action's input and output is exported, along with its Zod schema.

```ts
import type { JudgingEvent, JudgingSettings, Rubric, Judge, JudgingTeam, Review, JudgingAdminSetInput } from "@ubc-biztech/sdk";
import { ReviewSchema } from "@ubc-biztech/sdk";       // z.ZodType<Review>
```

## Migrating an existing app

Replace one call at a time. Keep the old fetch wrapper for everything the SDK does not cover yet, and add a
lint rule against new uses. If the SDK does not cover an endpoint you need, the fix is a declaration file in
`src/resources/` of this repo, not a raw fetch. See [`CONTRIBUTING.md`](./CONTRIBUTING.md), and
[`docs/guides/judging-portal.md`](./docs/guides/judging-portal.md) for a worked migration.

## Changing the SDK

You do not need to understand this repo to add an endpoint. `npm run new -- <service> <singular> <plural>`
scaffolds it, `npm run check` tells you what is left, and every error names the file and the fix.
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the recipes and [`docs/guides/how-it-works.md`](./docs/guides/how-it-works.md)
if you want to follow one call end to end.

```
src/
  resources/      THE API. One folder per backend service; the only place you edit.
    index.ts        registry: one import per service folder
    roles.ts        who may call what, and which credential each role sends
    judging/        hackathon judging
      index.ts        the service's entities and resources, in two objects
      shared.ts       scope, base path, phases, shared errors
      entities.ts     JudgingEvent, Rubric, Judge, JudgingTeam, Review, …
      event.ts        judging(e, y).info/get and judging(e, y).admin.*
      teams.ts        judging(e, y).team(id).*
      reviews.ts      judging(e, y).reviews.*
  core/           hand-written machinery. You should never need to open it.
    define.ts       the builders resources/ are written with (entity, resource, action, str, …) and the validator
    runtime.ts      the one place HTTP happens
  generated/      output of `npm run gen`. Never edit; overwritten every time.
    client.ts schemas.ts errors.ts api.json
  index.ts        what the package exports
scripts/          the commands behind npm run gen / check / new / check:semver
docs/
  reference/      generated per-method reference (what each call takes, returns, throws)
  guides/         hand-written: how-it-works.md (one call end to end), judging-portal.md (a worked migration)
test/             unit, validation, guardrails, semver rules, and the daily contract test against api-dev
CHANGELOG.md      what changed in each version
```
