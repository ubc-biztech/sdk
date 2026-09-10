# Using @ubcbiztech/sdk

One client per app. Every method is exactly one HTTP call to `api.ubcbiztech.com`. Types, schemas and the
reference in `docs/` are generated from the BizTech ontology; the JSDoc on every method says what it does,
what auth it needs, and what it throws.

```ts
import { createClient } from "@ubcbiztech/sdk";

export const bt = createClient({
  baseUrl: process.env.NEXT_PUBLIC_STAGE === "production" ? "https://api.ubcbiztech.com" : "https://api-dev.ubcbiztech.com",
  // Return the Cognito ID token, or null when signed out. Omit entirely for public-only apps.
  getToken: async () => (await fetchAuthSession()).tokens?.idToken?.toString() ?? null,
});
```

## The shape

- `bt.<plural>.<action>(input)` acts on a collection: `bt.events.list()`, `bt.teams.scores()`.
- `bt.<singular>(...key).<action>(input)` acts on one thing: `bt.event("blueprint", 2026).get()`,
  `bt.team(teamId).feedback()`, `bt.judge(email).submit({...})`.
- `bt.<singular>(...key).<link>()` follows a declared relationship in one call:
  `bt.event("blueprint", 2026).registrations()`.
- Singletons have no key: `bt.me.get()`, `bt.judgingRound.get()`.

## Worked calls

```ts
// Upcoming published events for a member-facing page. `list` includes unpublished rows.
const upcoming = (await bt.events.list()).filter((e) => e.isPublished && new Date(e.endDate) > new Date());

// One event. Throws EventNotFoundError (a class, not a 404 object).
try {
  const event = await bt.event("blueprint", 2026).get();
} catch (e) {
  if (e instanceof EventNotFoundError) notFound();
  else throw e;
}

// Judging: what team is this judge on, and submit scores for it in the current round.
const { currentTeamID } = await bt.judge(judgeEmail).currentTeam();
await bt.judge(judgeEmail).submit({
  teamID: currentTeamID, eventID: "hellohacks", year: 2026,
  scores: { metric1: 4, metric2: 5, metric3: 3, metric4: 4, metric5: 5 },   // all non-zero
  feedback: "Great demo, unclear business model.",
});

// Admin: leaderboard for the current round. teamID here is "<teamId>;<round>".
const board = (await bt.teams.scores()).sort((a, b) => b.zScoreWeighted - a.zScoreWeighted);

// The signed-in user's own registrations.
const me = await bt.me.get();
const mine = await bt.registrations.list({ email: me.id });
```

## Rules

- **Never write `fetch(API_URL + "/...")`** for anything the SDK covers. If it does not cover what you need,
  the fix is a declaration in this repo's `src/ontology/`, not a raw call.
- **Do not catch `ContractViolationError`.** It means the backend returned something the ontology does not
  declare. Report it; the declaration gets fixed.
- **Undeclared fields are stripped.** If the backend sends `foo` and the type does not have `foo`, you will
  not see `foo`. Declare it if you need it.
- **Errors are classes.** Branch on `instanceof EventNotFoundError`, or on `err instanceof ApiError && err.status >= 500`.
  Never on a status number pulled out of a thrown object.
- **Read the JSDoc note on `team(...).feedback()` and `judge(...).submissions()`.** The backend currently returns
  500 or 502 when there is nothing to return; the SDK documents that rather than hiding it.
- Everything is typed. If you find yourself writing `as any`, the type is telling you something.
