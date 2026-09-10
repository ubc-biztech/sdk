import type { Roles } from "./dsl.js";

/**
 * The vocabulary every action's `auth` refers to. Nothing else may invent a role.
 * Adding a role is a minor version; removing or renaming one is a major.
 *
 * Only `public` and `authenticated` are enforced anywhere today. `member` is what the
 * docs describe (`isMember === true` on the user record) and `admin` is what
 * `endsWith("@ubcbiztech.com")` gates in three services. They are declared now so
 * actions can be honest about intent; a generated router enforces them later.
 */
export const roles: Roles = {
  public: { description: "No token required. Anyone on the internet." },
  authenticated: { description: "Any valid Cognito JWT for the environment's user pool." },
  member: { description: "Authenticated, and the caller's biztechUsers record has isMember === true." },
  admin: { description: "Today: caller's email ends with @ubcbiztech.com. Intended: Cognito group `admin`." },
};
