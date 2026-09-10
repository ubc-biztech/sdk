# @ubc-biztech/sdk

Typed client for BizTech club data. One call per method, one HTTP request per call, to
`api.ubcbiztech.com`. Everything below is generated from a declared ontology, so the types, the
error classes and the JSDoc on every method agree with each other by construction.

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
  // Return the Cognito ID token, or null when signed out. Omit for public-only apps.
  getToken: async () => (await fetchAuthSession()).tokens?.idToken?.toString() ?? null,
});
```

| Option | Type | Notes |
|---|---|---|
| `baseUrl` | `string` | No trailing slash. |
| `getToken` | `() => string \| null \| Promise<…>` | Called on every request. Actions whose auth is not `public` throw `NotAuthenticatedError` before any HTTP if it returns null. |
| `fetch` | `typeof fetch` | Override for tests or non-browser runtimes. |
| `validateOutput` | `boolean` | Default `true`. Set `false` only in an emergency during a live event, then file the drift. |

## How calls are shaped

```ts
bt.<plural>.<action>(input)              // collection:  bt.events.list()
bt.<singular>(...key).<action>(input)    // one thing:   bt.event("blueprint", 2026).get()
bt.<singular>(...key).<link>()           // relationship: bt.event("blueprint", 2026).teams()
bt.<singleton>.<action>(input)           // no key:      bt.me.get(), bt.judgingRound.get()
```

Every method returns a `Promise` of a typed value. Input is validated before sending; output is
validated after, and fields the ontology does not declare are stripped.

## Reference

Full per-method reference with input and output tables: [`docs/`](./docs/README.md).

### Events

```ts
const events = await bt.events.list();                     // Event[], all years, includes unpublished
const blue   = await bt.events.list({ id: "blueprint" });  // all years of one event
const event  = await bt.event("blueprint", 2026).get();    // full record; throws EventNotFoundError
const counts = await bt.event("blueprint", 2026).counts(); // { registeredCount, checkedInCount, waitlistCount }
const regs   = await bt.event("blueprint", 2026).registrations(); // Registration[]  (token required)
const teams  = await bt.event("blueprint", 2026).teams();         // Team[]          (token required)
```

`events.list` is public and returns unpublished rows too. Filter on `isPublished` for member-facing UI.

### Registrations

```ts
const mine  = await bt.registrations.list({ email: "me@example.com" });
const forEv = await bt.registrations.list({ eventID: "blueprint", year: 2026 });
```

At least one of `email` or the `eventID` + `year` pair is required. Non-admins only receive their own.

### Users

```ts
const me   = await bt.me.get();                       // the signed-in user; throws UserNotFoundError
const user = await bt.user("someone@ubc.ca").get();   // admin only
```

### Teams

```ts
const teams = await bt.teams.list({ eventID: "hellohacks", year: 2027 });   // memberIDs only for admins
const board = await bt.teams.scores();                                      // NormalizedTeamScore[], public
const mine  = await bt.teams.forUser({ user_id: "me@ubc.ca", eventID: "hellohacks", year: 2027 });

await bt.teams.create({ team_name: "productx", eventID: "hellohacks", year: 2027, memberIDs: ["a@ubc.ca"] });
await bt.teams.join({ memberID: "b@ubc.ca", eventID: "hellohacks", year: 2027, teamID });
await bt.teams.leave({ memberID: "b@ubc.ca", eventID: "hellohacks", year: 2027 });
await bt.teams.rename({ user_id: "a@ubc.ca", eventID: "hellohacks", year: 2027, team_name: "producty" });
await bt.teams.addPoints({ user_id: "a@ubc.ca", eventID: "hellohacks", year: 2027, change_points: 10 });

const fb = await bt.team(teamID).feedback();                     // { scores: { "1": JudgeSubmission[] } }
await bt.team(teamID).assignJudges({ judgeIDs: ["j@corp.com"] }); // throws AllJudgesDoneError (409)
```

In `teams.scores()` the `teamID` field is `"<teamId>;<round>"`. Split on `;` to get the team.

### Judging

Judges are identified by email. They must hold a partner registration for the event.

```ts
const { round } = await bt.judgingRound.get();          // "1"; one global counter, not per event
await bt.judgingRound.set({ round: "2" });

const { currentTeamID, currentTeamName } = await bt.judge("j@corp.com").currentTeam();
const all = await bt.judge("j@corp.com").submissions(); // { scores: { "1": [...], "2": [...] } }

await bt.judge("j@corp.com").submit({
  teamID: currentTeamID, eventID: "hellohacks", year: 2027,
  scores: { metric1: 4, metric2: 5, metric3: 3, metric4: 4, metric5: 5 },  // all non-zero
  feedback: "Great demo, unclear business model.",
});                                                     // throws InvalidScoresError (400), NotAJudgeError (409)

await bt.judge("j@corp.com").updateSubmission({ teamID, round: "1", feedback: "Revised." });
```

`team(...).feedback()` and `judge(...).submissions()` currently return HTTP 500 or 502 when there is nothing
to return (a backend bug: the handler throws its 404 inside a `try`). Catch `ApiError` with `status >= 500`
and treat it as empty until that is fixed.

## Errors

Every failure is a thrown class. Branch on `instanceof`, never on a status number pulled from an object.

| Class | When |
|---|---|
| `EventNotFoundError`, `UserNotFoundError`, `TeamNotFoundError`, `MissingFilterError`, `AllJudgesDoneError`, `InvalidScoresError`, `NotAJudgeError` | A status the action declares. See each method's JSDoc. |
| `ApiError` | Any other non-2xx. Has `.status`, `.action`, `.details`. |
| `NotAuthenticatedError` | Action needs a token and `getToken` returned null. Thrown before any HTTP. |
| `InputError` | Your input failed the declared schema. Thrown before any HTTP. `.details` has the issues. |
| `ContractViolationError` | The backend returned something the ontology does not declare. Do not catch this; report it. |

```ts
import { EventNotFoundError, ApiError } from "@ubc-biztech/sdk";

try {
  return await bt.event(id, year).get();
} catch (e) {
  if (e instanceof EventNotFoundError) return notFound();
  if (e instanceof ApiError && e.status >= 500) return retryLater();
  throw e;
}
```

## Types

Every entity and every action's input and output is exported, along with its Zod schema.

```ts
import type { Event, Registration, Team, JudgeScores, User } from "@ubc-biztech/sdk";
import { EventSchema } from "@ubc-biztech/sdk";       // z.ZodType<Event>
```

## Migrating an existing app

Replace one call at a time. Keep the old fetch wrapper for everything the SDK does not cover yet, and add a
lint rule against new uses. If the SDK does not cover an endpoint you need, the fix is a declaration in
`src/ontology/` of this repo, not a raw fetch. See [`CONTRIBUTING.md`](./CONTRIBUTING.md), and
[`guides/judging-portal.md`](./guides/judging-portal.md) for a worked migration.

## Changing the SDK

You do not need to understand this repo to add an endpoint. `npm run new -- <singular> <plural>`
scaffolds it, `npm run check` tells you what is left, and every error names the file and the fix.
See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the recipes and [`guides/how-it-works.md`](./guides/how-it-works.md)
if you want to follow one call end to end.

```
src/ontology/   the declaration: roles, entities, resources. The only thing you edit.
src/client/     runtime.ts + index.ts are hand-written; generated/ is not
src/gen/        the generator (template strings). You should never need to open it.
docs/           generated reference
guides/         migration guides and the end-to-end walkthrough
test/           unit, validation, guardrails, semver rules, and the daily contract test against api-dev
```
