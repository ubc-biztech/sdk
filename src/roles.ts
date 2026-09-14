import type { Roles } from "./define.js";

/**
 * The vocabulary every action's `auth` refers to. Nothing else may invent a role.
 * Adding a role is a minor version; removing or renaming one is a major.
 *
 * Each role says what credential the runtime sends:
 *
 * - `none`  — nothing. Public.
 * - `code`  — the `X-Judging-Code` header, from `ClientConfig.getCode`. Judges and teams have no
 *             BizTech account; an organizer mints their codes and the backend resolves a code to
 *             who it belongs to.
 * - `token` — `Authorization: Bearer <Cognito ID token>`, from `ClientConfig.getToken`. Organizers
 *             sign in with their BizTech exec account; the backend checks it is an admin.
 *
 * A code never satisfies a token action and a token never satisfies a code action. The backend
 * exposes organizer work on separate routes, so the two families never meet on one action.
 */
export const roles: Roles = {
  public: { credential: "none", description: "No credential. Anyone on the internet." },
  judgingCode: { credential: "code", description: "Any code the event knows: a team's or a judge's. Row-level filtering (a team sees only its own reviews) is the backend's job." },
  judge: { credential: "code", implies: ["judgingCode"], description: "A judge's code for the event. A team code gets 403." },
  admin: { credential: "token", description: "A Cognito ID token for a BizTech exec (today: a verified @ubcbiztech.com email). Not a code." },
};
