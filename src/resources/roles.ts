import type { Roles } from "../core/define.js";

// A code never satisfies a token action and a token never satisfies a code action: the backend
// keeps organizer work on separate routes, so a role only ever implies roles with the same credential.
export const roles: Roles = {
  public: { credential: "none", description: "No credential. Anyone on the internet." },
  judgingCode: { credential: "code", description: "Any code the event knows: a team's or a judge's. Row-level filtering (a team sees only its own reviews) is the backend's job." },
  judge: { credential: "code", implies: ["judgingCode"], description: "A judge's code for the event. A team code gets 403." },
  admin: { credential: "token", description: "A Cognito ID token for a BizTech exec (today: a verified @ubcbiztech.com email). Not a code." },
};
