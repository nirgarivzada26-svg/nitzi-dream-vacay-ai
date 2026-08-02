// Single switch between the Demo Provider set and live suppliers.
//
// DEMO_MODE=true  -> the Demo Provider answers every search/verify call.
// DEMO_MODE=false -> live adapters (Amadeus / Booking / Hotelbeds / …) are used.
//                    Until an adapter is registered the app reports
//                    "unavailable" instead of inventing data.
//
// Flip it with VITE_DEMO_MODE=false — no UI, route or booking-flow change.

const raw = (import.meta.env.VITE_DEMO_MODE ?? "true").toString().toLowerCase();

export const DEMO_MODE = raw !== "false" && raw !== "0";

/** Provider id stamped on every quote so the UI can show its source. */
export const PROVIDER_ID = DEMO_MODE ? "nitzi-demo" : "live";

export const PROVIDER_LABEL = DEMO_MODE ? "NITZI Demo Provider" : "ספק חי";

/** How long a returned quote is trusted before it must be re-verified. */
export const QUOTE_TTL_SECONDS = 900;
