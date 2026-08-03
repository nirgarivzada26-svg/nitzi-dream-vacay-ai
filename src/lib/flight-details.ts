// Fare details for a flight offer.
//
// Nothing here is invented per-flight: every value is derived from data the
// offer already carries (carrier code inside `flightNumber`, stops, duration)
// plus the carrier registry in `providers/airlines.ts`. When a live supplier
// returns its own fare rules, replace `fareDetails` with that payload — the UI
// consumes this shape only.

import { getAirline, type Airline } from "./providers/airlines";
import type { Flight } from "./providers/types";

export interface FlightFareDetails {
  airlineCode: string | null;
  airline: Airline | null;
  aircraft: string | null;
  cabin: string;
  carryOn: string;
  checkedBag: string;
  meal: string;
  seatSelection: string;
  changePolicy: string;
  refundPolicy: string;
  alliance: string | null;
}

const ALLIANCE_LABEL: Record<string, string> = {
  star: "Star Alliance",
  skyteam: "SkyTeam",
  oneworld: "Oneworld",
};

/** Stable index from a string, so the same flight always shows the same aircraft. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function carrierCodeOf(flight: Pick<Flight, "flightNumber">): string | null {
  const m = /^([A-Z0-9]{2})\s?\d+/i.exec(flight.flightNumber ?? "");
  return m ? m[1].toUpperCase() : null;
}

export function fareDetails(flight: Flight): FlightFareDetails {
  const code = carrierCodeOf(flight);
  const airline = code ? getAirline(code) : null;
  const aircraft =
    airline && airline.aircraft.length > 0
      ? airline.aircraft[hash(flight.id) % airline.aircraft.length]
      : null;
  const lowCost = airline?.lowCost ?? false;

  return {
    airlineCode: code,
    airline,
    aircraft,
    alliance: airline?.alliance ? ALLIANCE_LABEL[airline.alliance] : null,
    cabin: "מחלקת תיירים (Economy)",
    carryOn: lowCost ? "תיק אישי בלבד — טרולי בתשלום" : "טרולי 8 ק״ג + תיק אישי",
    checkedBag: lowCost ? "מזוודה בתשלום בהזמנה" : "מזוודה 20 ק״ג כלולה",
    meal: lowCost ? "כיבוד ומשקאות בתשלום" : "ארוחה קלה כלולה",
    seatSelection: lowCost ? "בחירת מושב בתשלום" : "בחירת מושב חינם בצ׳ק-אין",
    changePolicy: lowCost ? "שינוי בתשלום לפי מדיניות המוביל" : "שינוי בתשלום עד 24 שעות לפני",
    refundPolicy: "ביטול בכפוף למדיניות חברת התעופה",
  };
}
