// Alternative flight options for a canonical deal.
//
// Options are generated deterministically from the deal's own structured
// fields (route, dates, duration, carriers that serve the destination country).
// Selecting one NEVER mutates the canonical deal record — it produces a derived
// "booking configuration" that is re-validated before a booking request.

import type { Deal, DealFlight } from "./deals";
import { AIRLINES } from "./providers/airlines";

export type AltLabel =
  | "הכי זולה"
  | "טיסה ישירה"
  | "שעות נוחות יותר"
  | "כולל מזוודה"
  | "גמישה יותר"
  | "הבחירה של NITZI";

export interface FlightAlternative {
  id: string;
  labels: AltLabel[];
  outbound: DealFlight;
  inbound: DealFlight;
  /** Difference vs. the canonical per-person price, in ILS. */
  priceDeltaPerPerson: number;
  carryOnIncluded: boolean;
  checkedBagIncluded: boolean;
  checkedBagKg: number | null;
  changeable: boolean;
  refundable: boolean;
  cabin: string;
  fareType: string;
}

function carriersFor(countryCode: string) {
  const cc = (countryCode || "").toUpperCase();
  const list = AIRLINES.filter((a) => a.serves === "*" || a.serves.includes(cc));
  return list.length > 0 ? list : AIRLINES.filter((a) => a.serves === "*");
}

function shift(flight: DealFlight, hours: number, durationDelta: number): DealFlight {
  const depart = new Date(new Date(flight.departAt).getTime() + hours * 3600_000);
  const duration = Math.max(60, flight.durationMinutes + durationDelta);
  return {
    ...flight,
    departAt: depart.toISOString(),
    arriveAt: new Date(depart.getTime() + duration * 60_000).toISOString(),
    durationMinutes: duration,
  };
}

const RECOMMENDED_ID = "recommended";

/** The recommended option first, then valid alternatives on the same dates. */
export function flightAlternatives(deal: Deal): FlightAlternative[] {
  const carriers = carriersFor(deal.destination.countryCode);
  const baseDirect = deal.outbound.stops === 0 && deal.inbound.stops === 0;

  const recommended: FlightAlternative = {
    id: RECOMMENDED_ID,
    labels: ["הבחירה של NITZI", ...(baseDirect ? (["טיסה ישירה"] as AltLabel[]) : [])],
    outbound: deal.outbound,
    inbound: deal.inbound,
    priceDeltaPerPerson: 0,
    carryOnIncluded: true,
    checkedBagIncluded: true,
    checkedBagKg: 20,
    changeable: true,
    refundable: deal.freeCancellation,
    cabin: "מחלקת תיירים (Economy)",
    fareType: "Standard",
  };

  const out: FlightAlternative[] = [recommended];

  const lowCost = carriers.find((c) => c.lowCost);
  if (lowCost) {
    const stops = deal.destination.directFlightFromTLV ? 0 : 1;
    const extraMin = stops === 0 ? -15 : 120;
    out.push({
      id: "budget",
      labels: ["הכי זולה", ...(stops === 0 ? (["טיסה ישירה"] as AltLabel[]) : [])],
      outbound: {
        ...shift(deal.outbound, -3, extraMin),
        airline: lowCost.name,
        flightNumber: `${lowCost.code}${(deal.dates.nights * 37 + 210) % 900}`,
        stops,
      },
      inbound: {
        ...shift(deal.inbound, 2, extraMin),
        airline: lowCost.name,
        flightNumber: `${lowCost.code}${(deal.dates.nights * 53 + 310) % 900}`,
        stops,
      },
      priceDeltaPerPerson: -Math.round((deal.price.perPerson * 0.09) / 10) * 10,
      carryOnIncluded: true,
      checkedBagIncluded: false,
      checkedBagKg: null,
      changeable: false,
      refundable: false,
      cabin: "מחלקת תיירים (Economy Basic)",
      fareType: "Basic — ללא מזוודה",
    });
  }

  const legacy = carriers.find((c) => !c.lowCost && c.name !== deal.outbound.airline);
  if (legacy) {
    out.push({
      id: "comfort",
      labels: ["שעות נוחות יותר", "כולל מזוודה", "גמישה יותר"],
      outbound: {
        ...shift(deal.outbound, 4, 0),
        airline: legacy.name,
        flightNumber: `${legacy.code}${(deal.dates.nights * 71 + 120) % 900}`,
        stops: deal.destination.directFlightFromTLV ? 0 : deal.outbound.stops,
      },
      inbound: {
        ...shift(deal.inbound, -2, 0),
        airline: legacy.name,
        flightNumber: `${legacy.code}${(deal.dates.nights * 91 + 420) % 900}`,
        stops: deal.destination.directFlightFromTLV ? 0 : deal.inbound.stops,
      },
      priceDeltaPerPerson: Math.round((deal.price.perPerson * 0.07) / 10) * 10,
      carryOnIncluded: true,
      checkedBagIncluded: true,
      checkedBagKg: 23,
      changeable: true,
      refundable: true,
      cabin: "מחלקת תיירים (Economy Flex)",
      fareType: "Flex — שינוי וביטול",
    });
  }

  return out;
}

export function findAlternative(deal: Deal, id: string | null): FlightAlternative {
  const list = flightAlternatives(deal);
  return list.find((a) => a.id === id) ?? list[0];
}

/**
 * Derived deal for a selected flight option. The canonical record is untouched;
 * this is the shape the booking request is built from.
 */
export function applyAlternative(deal: Deal, id: string | null): Deal {
  const alt = findAlternative(deal, id);
  if (alt.id === RECOMMENDED_ID) return deal;
  const perPerson = Math.max(1, deal.price.perPerson + alt.priceDeltaPerPerson);
  const includes = deal.includes.filter((i) => !i.includes("כבודה"));
  if (alt.checkedBagIncluded && alt.checkedBagKg)
    includes.push(`כבודה ${alt.checkedBagKg} ק״ג לאדם`);
  return {
    ...deal,
    outbound: alt.outbound,
    inbound: alt.inbound,
    includes,
    price: {
      ...deal.price,
      perPerson,
      total: perPerson * deal.people,
    },
  };
}

export const RECOMMENDED_ALTERNATIVE_ID = RECOMMENDED_ID;
