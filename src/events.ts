import { entity, resource, action, link, str, int, num, bool, json, list, obj, ref } from "./define.js";

/**
 * Field list is what `GET /events/{id}/{year}` returns on api-dev (verified 2026-09-10)
 * plus fields the frontend's `BiztechEvent` type expects. Anything not listed here is
 * stripped by the SDK: if you need it, declare it.
 */
export const Event = entity({
  name: "Event",
  description:
    "A BizTech event. Identified by the pair (id, year): the same id recurs across years, e.g. `blueprint` 2024 and 2025. Stored in biztechEvents<stage>.",
  storage: { table: "biztechEvents", pk: "id", sk: "year" },
  fields: {
    id: str({ description: "URL slug, unique within a year. Lower-case, no spaces." }),
    year: int({ description: "Calendar year of the event. Together with `id` this is the primary key." }),
    ename: str({ description: "Display name." }),
    description: str({ optional: true, description: "Long-form description shown on the event page. Markdown-ish free text." }),
    partnerDescription: str({ optional: true, description: "Description shown to partner/company attendees." }),
    elocation: str({ optional: true, description: "Human-readable venue." }),
    startDate: str({ description: "ISO-8601 timestamp, UTC." }),
    endDate: str({ description: "ISO-8601 timestamp, UTC." }),
    deadline: str({ optional: true, description: "Registration deadline, ISO-8601 UTC. Registration is closed after this." }),
    capac: int({ description: "Capacity. Registrations beyond this are waitlisted." }),
    imageUrl: str({ optional: true, description: "Thumbnail/hero image URL." }),
    isPublished: bool({ description: "Visible to members. Unpublished events are only visible to admins." }),
    isCompleted: bool({ optional: true, description: "Event has happened; used to move it to the past-events list." }),
    isApplicationBased: bool({ optional: true, description: "Registrations are applications that an admin accepts or rejects, rather than first-come." }),
    nonBizTechAllowed: bool({ optional: true, description: "Non-members may register." }),
    pricing: obj(
      {
        members: num({ optional: true, description: "Price in CAD for members. 0 or absent means free." }),
        nonMembers: num({ optional: true, description: "Price in CAD for non-members. Absent means non-members cannot register." }),
      },
      { optional: true, description: "Ticket prices in CAD." },
    ),
    registrationQuestions: list(
      obj(
        {
          questionId: str({ description: "Stable id; the key used in Registration.dynamicResponses." }),
          label: str({ description: "Question text." }),
          type: str({ description: "Widget type, e.g. TEXT, SELECT, CHECKBOX, UPLOAD. Not an enum today." }),
          required: bool({ description: "Answer is mandatory." }),
          choices: list(str({ description: "One option." }), { optional: true, description: "Options for SELECT/CHECKBOX questions." }),
          charLimit: int({ optional: true, description: "Max answer length for text questions." }),
          questionImageUrl: str({ optional: true, description: "Optional image shown with the question." }),
        },
        { description: "One registration form question." },
      ),
      { optional: true, description: "Custom registration form for attendees." },
    ),
    partnerRegistrationQuestions: json({ optional: true, description: "Same shape as registrationQuestions, for partners. Declared loosely until it is used through the SDK." }),
    feedback: str({ optional: true, description: "Legacy feedback-form link. Superseded by attendeeFeedbackQuestions." }),
    attendeeFeedbackEnabled: bool({ optional: true, description: "Attendee feedback form is open." }),
    partnerFeedbackEnabled: bool({ optional: true, description: "Partner feedback form is open." }),
    createdAt: int({ description: "Epoch milliseconds." }),
    updatedAt: int({ optional: true, description: "Epoch milliseconds." }),
  },
});

export const EventCounts = entity({
  name: "EventCounts",
  description: "Registration tallies for one event, as returned by `GET /events/{id}/{year}?count=true`.",
  fields: {
    registeredCount: int({ description: "Registrations with status registered." }),
    checkedInCount: int({ description: "Registrations that have checked in." }),
    waitlistCount: int({ description: "Registrations on the waitlist." }),
    dynamicCounts: json({ optional: true, description: "Per-question answer tallies, keyed by questionId. Shape varies by question type." }),
  },
});

export const events = resource({
  singular: "event",
  plural: "events",
  entity: Event,
  description: "Events. `bt.events` for the collection, `bt.event(id, year)` for one.",
  key: {
    id: str({ description: "Event id (slug)." }),
    year: int({ description: "Event year." }),
  },
  collection: {
    list: action({
      description:
        "All events across all years, sorted by startDate. Public; unpublished events are included, so filter on isPublished for member-facing UI. Returns the overview projection: description and question arrays are absent.",
      auth: "public",
      input: { id: str({ optional: true, description: "Restrict to events with this id (all years)." }) },
      output: list(ref(Event, { description: "An event, overview projection." }), { description: "Events, ascending by startDate." }),
      route: { method: "GET", path: "/events", query: ["id"] },
    }),
  },
  instance: {
    get: action({
      description: "The full event record.",
      auth: "public",
      output: ref(Event, { description: "The event." }),
      errors: { EventNotFound: { status: 404, description: "No event with that id and year." } },
      route: { method: "GET", path: "/events/{id}/{year}" },
    }),
    counts: action({
      description: "Registration tallies.",
      auth: "public",
      output: ref(EventCounts, { description: "The tallies." }),
      errors: { EventNotFound: { status: 404, description: "No event with that id and year." } },
      route: { method: "GET", path: "/events/{id}/{year}", fixedQuery: { count: "true" } },
    }),
  },
  links: {
    registrations: link({
      description: "Every registration for this event, including waitlisted and cancelled. Requires a token.",
      via: "registrations.list",
      map: { eventID: "id", year: "year" },
    }),
    teams: link({
      description: "Every team formed for this event. Requires a token; member emails are only included for admins.",
      via: "teams.list",
      map: { eventID: "id", year: "year" },
    }),
  },
});
