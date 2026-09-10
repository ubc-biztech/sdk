import type { Roles } from "./dsl.js";

/**
 * The vocabulary every action's `auth` refers to. Nothing else may invent a role.
 * Adding a role is a minor version; removing or renaming one is a major.
 *
 * Two families:
 *
 * Cognito roles (`authenticated`, `member`, `admin`) come from the user pool JWT. Only
 * `public` and `authenticated` are enforced anywhere today; `member` and `admin` are declared
 * so actions can be honest about intent, and a generated router enforces them later.
 *
 * Code roles (`judgingCode`, `judge`, `judgingAdmin`) are for event-day tools where the people
 * involved (external judges, hackathon teams) have no BizTech account. The bearer token is a
 * short code issued by an organizer, resolved server-side by the judging service. An admin
 * code satisfies every judge action; a judge or team code satisfies every `judgingCode` action.
 * Code roles never grant anything outside the `judging` service.
 */
export const roles: Roles = {
  public: { description: "No token required. Anyone on the internet." },
  authenticated: { description: "Any valid Cognito JWT for the environment's user pool." },
  member: { description: "Authenticated, and the caller's biztechUsers record has isMember === true.", implies: ["authenticated"] },
  admin: { description: "Today: caller's email ends with @ubcbiztech.com. Intended: Cognito group `admin`.", implies: ["member"] },

  judgingCode: { description: "Bearer token is any valid code for the event: team, judge or admin. Row-level filtering (a team sees only its own reviews) is the handler's job." },
  judge: { description: "Bearer token is a judge code for the event.", implies: ["judgingCode"] },
  judgingAdmin: { description: "Bearer token is the event's organizer code.", implies: ["judge"] },
};
