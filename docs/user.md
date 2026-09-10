# `user`

Users by email. `bt.user(email).get()` is admin-only; non-admins should use `bt.me`.

**Key** (positional arguments of `bt.user(…)`)

| Field | Type | Description |
|---|---|---|
| `email` | string | The user's email. |

## `bt.user(email).get()`

One user by email. Admins only; a non-admin caller gets their own record back regardless of the email given.

- **Auth:** `admin`
- **Route:** `GET /users/{email}`

**Output:** [User](./entities.md#user) — The user.

**Errors**

| Error | HTTP | When |
|---|---|---|
| `UserNotFoundError` | 404 | No user with that email. |

