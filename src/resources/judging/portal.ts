import { resource, action, str, int, obj, list, oneOf, ref } from "../../core/define.js";
import { JudgingEvent } from "./entities.js";
import { PHASES, notAdmin } from "./shared.js";

const scope = {
  eventID: str({ description: "Lowercase event slug, such as hellohacks." }),
  year: int({ description: "Event year, from 2000 to 2100." }),
};
const invalidInput = { InvalidInput: { status: 406, description: "Invalid event name, ID or year." } };

export const judgingPortal = resource({
  singular: "judgingPortal",
  description: "Discover judging events and manage the shared landing event.",
  instance: {
    get: action({
      description: "Public event names, phases and branding, newest year first. No codes, teams or reviews.",
      auth: "public",
      output: obj({
        events: list(obj({ ...scope,
          eventName: str({ description: "Display name." }),
          phase: oneOf(PHASES, { description: "Current phase." }),
          imageUrl: str({ optional: true, description: "Public event image URL." }),
        }, { description: "An available event." }), { description: "Available judging events." }),
        defaultEvent: obj(scope, { nullable: true, description: "Shared landing event, or null before one is chosen." }),
      }, { description: "Event catalog." }),
      route: { method: "GET", path: "/judging" },
    }),
    setDefault: action({
      description: "Choose the existing event new visitors see first. Does not modify event data.",
      auth: "admin", input: scope,
      output: obj(scope, { description: "The saved default event." }),
      errors: { ...notAdmin, ...invalidInput, EventNotFound: { status: 404, description: "Create the event first." } },
      route: { method: "PUT", path: "/judging/default" },
    }),
    create: action({
      description: "Create an empty event in submission phase. Existing events are never replaced. Feedback is initially hidden.",
      auth: "admin",
      input: { ...scope, eventName: str({ description: "Display name, up to 120 characters." }) },
      output: ref(JudgingEvent, { description: "The new event." }),
      errors: { ...notAdmin, ...invalidInput, EventExists: { status: 409, description: "The ID and year already exist; select that event instead." } },
      route: { method: "POST", path: "/judging" },
    }),
  },
});

export const eventImage = resource({
  singular: "eventImage",
  description: "Upload event branding through the existing event image service.",
  instance: {
    uploadUrl: action({
      description: "Create a signed image upload URL, valid for 60 seconds. PUT the file bytes to uploadUrl with its Content-Type, then save publicUrl on the event.",
      auth: "admin",
      input: {
        fileType: str({ description: "Image MIME type." }),
        fileName: str({ description: "Original file name, including extension." }),
        prefix: oneOf(["original", "optimized"], { description: "Image folder." }),
        eventId: str({ description: "Event identifier for the storage folder." }),
      },
      output: obj({ uploadUrl: str({ description: "Signed PUT URL." }), publicUrl: str({ description: "Permanent public image URL." }) }, { description: "Upload destination." }),
      errors: { ...notAdmin, InvalidImage: { status: 400, description: "Missing fields or a non-image file type." } },
      route: { method: "POST", path: "/events/event-image-upload-url" },
    }),
  },
});
