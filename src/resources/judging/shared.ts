import { str, int, type Fields } from "../../core/define.js";

export const judgingScope = {
  name: "judging",
  description: "One event's judging. Keyed like an event: (eventID, year).",
  key: {
    eventID: str({ description: "Event id (slug), e.g. `hellohacks`." }),
    year: int({ description: "Event year." }),
  } satisfies Fields,
};
export const base = "/judging/{eventID}/{year}";
export const PHASES = ["submission", "prelim", "finals", "closed"] as const;
export const ROUNDS = ["prelim", "finals"] as const;

export const unknownCode = { UnknownCode: { status: 401, description: "The code matches no judge or team of this event (or no judging exists for it yet)." } };
export const notAdmin = { Forbidden: { status: 403, description: "The token is valid but its account is not a BizTech admin." } };
