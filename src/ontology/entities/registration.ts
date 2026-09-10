import { entity, resource, action, str, int, bool, json, list, ref } from "../dsl.js";

export const Registration = entity({
  name: "Registration",
  description:
    "One user's registration for one event. Keyed by the user's email (`id`) and the composite `eventID;year` string, which is the literal attribute name in DynamoDB.",
  storage: { table: "biztechRegistrations", pk: "id", sk: "eventID;year" },
  fields: {
    id: str({ description: "Registrant's email, lower-case. Joins to User.id." }),
    "eventID;year": str({ description: "Composite key `<eventId>;<year>`, e.g. `blueprint;2026`. Yes, the semicolon is in the attribute name." }),
    fname: str({ optional: true, description: "First name at registration time." }),
    registrationStatus: str({ description: "One of registered, checkedIn, waitlist, cancelled, incomplete. Free string on the wire; not enforced server-side." }),
    applicationStatus: str({ optional: true, description: "For application-based events: accepted, rejected, reviewing, waitlist." }),
    isPartner: bool({ optional: true, description: "Registered through the partner/company flow. Judges are partner registrations." }),
    basicInformation: json({ optional: true, description: "Name, year, faculty, diet, etc. Shape differs for attendee vs partner; declared loosely for now." }),
    dynamicResponses: json({ optional: true, description: "Answers keyed by Event.registrationQuestions[].questionId." }),
    points: int({ optional: true, description: "Gamification points earned at the event." }),
    scannedQRs: list(str({ description: "QR id." }), { optional: true, description: "QR codes this registrant has scanned." }),
    studentId: str({ optional: true, description: "UBC student number as entered." }),
    checkoutLink: str({ optional: true, description: "Stripe checkout URL while payment is pending." }),
    createdAt: int({ optional: true, description: "Epoch milliseconds." }),
    updatedAt: int({ optional: true, description: "Epoch milliseconds." }),
  },
});

export const registrations = resource({
  singular: "registration",
  plural: "registrations",
  entity: Registration,
  description: "Registrations. Read-only through the SDK for now; writes still go through the registration form.",
  collection: {
    list: action({
      description:
        "Registrations filtered by registrant email and/or event. At least one of `email` or the (`eventID`, `year`) pair is required; the backend rejects an empty query. Non-admins receive only their own.",
      auth: "authenticated",
      input: {
        email: str({ optional: true, description: "Registrant email. Case-insensitive." }),
        eventID: str({ optional: true, description: "Event id (slug). Must be paired with `year`." }),
        year: int({ optional: true, description: "Event year. Must be paired with `eventID`." }),
      },
      output: list(ref(Registration, { description: "A registration." }), { description: "Matching registrations. Empty array when none." }),
      errors: { MissingFilter: { status: 406, description: "Neither email nor eventID+year was given." } },
      route: { method: "GET", path: "/registrations", query: ["email", "eventID", "year"] },
    }),
  },
});
