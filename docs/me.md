# `me`

The signed-in user, resolved from the JWT. A singleton: `bt.me.get()`.

## `bt.me.get()`

The caller's own user record.

- **Auth:** `authenticated`
- **Route:** `GET /users/self`

**Output:** [User](./entities.md#user) — The caller.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UserNotFoundError` | 404 | No user record for the caller's email yet. |

