import { entity, resource, action, str, int, bool, json, ref } from "../dsl.js";

export const User = entity({
  name: "User",
  description: "A BizTech account, keyed by email. Created on first sign-in. Membership is a paid annual flag on this record.",
  storage: { table: "biztechUsers", pk: "id" },
  fields: {
    id: str({ description: "Email, lower-case. Primary key." }),
    fname: str({ optional: true, description: "First name." }),
    lname: str({ optional: true, description: "Last name." }),
    studentId: str({ optional: true, description: "UBC student number." }),
    faculty: str({ optional: true, description: "Faculty as entered." }),
    major: str({ optional: true, description: "Major as entered." }),
    year: str({ optional: true, description: "Study year as entered, e.g. `3rd Year`. Free text." }),
    isMember: bool({ optional: true, description: "Has an active paid membership. This is the docs' `member` role." }),
    admin: bool({ optional: true, description: "Set at creation from the email domain. Not read for authorization anywhere today." }),
    favedEventsID: json({ optional: true, description: "Array of `eventId;year` strings the user favourited." }),
    createdAt: int({ optional: true, description: "Epoch milliseconds." }),
    updatedAt: int({ optional: true, description: "Epoch milliseconds." }),
  },
});

/** Singleton: the signed-in user. `bt.me.get()`. */
export const me = resource({
  singular: "me",
  entity: User,
  description: "The signed-in user, resolved from the JWT. A singleton: `bt.me.get()`.",
  instance: {
    get: action({
      description: "The caller's own user record.",
      auth: "authenticated",
      output: ref(User, { description: "The caller." }),
      errors: { UserNotFound: { status: 404, description: "No user record for the caller's email yet." } },
      route: { method: "GET", path: "/users/self" },
    }),
  },
});

export const users = resource({
  singular: "user",
  plural: "users",
  entity: User,
  description: "Users by email. `bt.user(email).get()` is admin-only; non-admins should use `bt.me`.",
  key: { email: str({ description: "The user's email." }) },
  instance: {
    get: action({
      description: "One user by email. Admins only; a non-admin caller gets their own record back regardless of the email given.",
      auth: "admin",
      output: ref(User, { description: "The user." }),
      errors: { UserNotFound: { status: 404, description: "No user with that email." } },
      route: { method: "GET", path: "/users/{email}" },
    }),
  },
});
