# For coding agents working in an app that uses @ubc-biztech/sdk

Read [`README.md`](./README.md) for how to call it. These are the rules.

- **Never write `fetch(API_URL + "/...")`** for anything the SDK covers. If it does not cover what you need,
  the fix is a declaration in this repo's `src/ontology/`, not a raw call.
- **Do not catch `ContractViolationError`.** It means the backend returned something the ontology does not
  declare. Report it; the declaration gets fixed.
- **Undeclared fields are stripped.** If the backend sends `foo` and the type does not have `foo`, you will
  not see `foo`. Declare it if you need it.
- **Errors are classes.** Branch on `instanceof EventNotFoundError`, or on `err instanceof ApiError && err.status >= 500`.
  Never on a status number pulled out of a thrown object.
- **Read the JSDoc.** Every method says what it does, what auth it needs, and what it throws. Hover it.
- Everything is typed. If you find yourself writing `as any`, the type is telling you something.
