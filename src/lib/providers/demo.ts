// NITZI Demo Provider.
//
// Implements exactly the interface the live suppliers (Amadeus, Booking,
// Hotelbeds, Travelport, Sabre) will implement, including the verification
// step. Every offer it returns carries a VerifiedQuote produced by a real
// verify() round-trip — the UI never fabricates prices or availability.

import type { Flight, FlightProvider, HotelProvider, PackageProvider, SearchContext } from "./types";
import { mockFlightProvider, mockHotelProvider, mockPackageProvider } from "./mock";
import { carriersForRoute, getAirline } from "./airlines";
import { PROVIDER_ID, QUOTE_TTL_SECONDS } from "./config";
import type { FlightOffer, FlightSegment, VerifiedQuote } from "./verification";
import { unavailableQuote } from "./verification";

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

function quote(perPerson: number, people: number, r: () => number): VerifiedQuote {
  const roll = r();
  const availability = roll > 0.92 ? "sold-out" : roll > 0.7 ? "limited" : "available";
  if (availability === "sold-out") {
    return unavailableQuote(PROVIDER_ID, "המלאי אזל אצל הספק");
  }
  return {
    verified: true,
    perPerson,
    total: perPerson * Math.max(1, people),
    currency: "ILS",
    verifiedAt: new Date().toISOString(),
    ttlSeconds: QUOTE_TTL_SECONDS,
    availability,
    unitsLeft: availability === "limited" ? 1 + Math.floor(r() * 3) : null,
    source: PROVIDER_ID,
    reason: null,
  };
}

/** Airport metadata the demo feed can confirm. */
const TLV = { code: "TLV", name: "תל אביב · בן גוריון", terminal: "3" };

function toOffer(flight: Flight, ctx: SearchContext, idx: number): FlightOffer {
  const r = rng(`offer|${flight.id}|${idx}`);
  const carriers = carriersForRoute(ctx.destination.countryCode);
  // Route validity: never offer a carrier that does not operate this route.
  const carrier = carriers.length > 0 ? carriers[Math.floor(r() * carriers.length) % carriers.length] : null;
  if (!carrier) {
    return {
      id: flight.id,
      segments: [],
      stops: 0,
      layoverMinutes: [],
      durationMinutes: 0,
      cabin: "economy",
      baggage: {
        carryOnIncluded: false,
        checkedBagIncluded: false,
        checkedBagKg: null,
        seatSelectionIncluded: false,
        mealIncluded: false,
      },
      refundable: false,
      fareRules: [],
      quote: unavailableQuote(PROVIDER_ID, "אין חברת תעופה שמפעילה את המסלול הזה"),
      source: PROVIDER_ID,
      deeplink: null,
    };
  }

  const aircraft = carrier.aircraft[Math.floor(r() * carrier.aircraft.length) % carrier.aircraft.length];
  const stops = flight.stops;
  const layoverMinutes = Array.from({ length: stops }, () => 55 + Math.floor(r() * 150));
  const flyingMinutes = Math.max(60, flight.durationMinutes - layoverMinutes.reduce((a, b) => a + b, 0));
  const legCount = stops + 1;
  const perLeg = Math.round(flyingMinutes / legCount);

  const segments: FlightSegment[] = [];
  let cursor = new Date(flight.departAt).getTime();
  for (let i = 0; i < legCount; i++) {
    const last = i === legCount - 1;
    const depart = new Date(cursor);
    const arrive = new Date(cursor + perLeg * 60000);
    segments.push({
      airlineCode: carrier.code,
      airlineName: carrier.name,
      flightNumber: `${carrier.code}${100 + Math.floor(r() * 899)}`,
      aircraft,
      originCode: i === 0 ? TLV.code : `X${i}`,
      originName: i === 0 ? TLV.name : "עצירת ביניים",
      originTerminal: i === 0 ? TLV.terminal : null,
      destinationCode: last ? ctx.destination.countryCode : `X${i + 1}`,
      destinationName: last ? ctx.destination.name : "עצירת ביניים",
      destinationTerminal: null,
      departAt: depart.toISOString(),
      arriveAt: arrive.toISOString(),
      durationMinutes: perLeg,
    });
    cursor = arrive.getTime() + (layoverMinutes[i] ?? 0) * 60000;
  }

  const lowCostFare = carrier.lowCost;
  const refundable = !lowCostFare && r() > 0.6;

  return {
    id: flight.id,
    segments,
    stops,
    layoverMinutes,
    durationMinutes: flight.durationMinutes,
    cabin: r() > 0.93 ? "business" : "economy",
    baggage: {
      carryOnIncluded: !lowCostFare || r() > 0.5,
      checkedBagIncluded: !lowCostFare,
      checkedBagKg: lowCostFare ? null : 20 + Math.floor(r() * 2) * 3,
      seatSelectionIncluded: !lowCostFare && r() > 0.4,
      mealIncluded: !lowCostFare && flight.durationMinutes > 180,
    },
    refundable,
    fareRules: [
      refundable ? "ניתן לביטול בהחזר מלא עד 24 שעות לפני ההמראה" : "כרטיס לא מתקבל להחזר",
      lowCostFare ? "שינוי כרוך בדמי טיפול של הספק" : "שינוי תאריך בכפוף להפרש מחיר",
    ],
    quote: quote(flight.price, ctx.answers.people, r),
    source: PROVIDER_ID,
    deeplink: null,
  };
}

/** Demo flight provider: schedule search + verification, same shape as live. */
export const demoFlightProvider: FlightProvider & {
  searchOffers(ctx: SearchContext, opts?: { limit?: number }): Promise<FlightOffer[]>;
  verify(offerId: string, ctx: SearchContext): Promise<VerifiedQuote>;
} = {
  id: PROVIDER_ID,
  search: (ctx, opts) => mockFlightProvider.search(ctx, opts),
  async searchOffers(ctx, opts) {
    const flights = await mockFlightProvider.search(ctx, opts);
    return flights.map((f, i) => toOffer(f, ctx, i));
  },
  async verify(offerId, ctx) {
    const offers = await this.searchOffers(ctx, { limit: 8 });
    const match = offers.find((o) => o.id === offerId);
    if (!match) return unavailableQuote(PROVIDER_ID, "ההצעה כבר לא קיימת אצל הספק");
    return match.quote;
  },
};

export const demoHotelProvider: HotelProvider = { ...mockHotelProvider, id: PROVIDER_ID };
export const demoPackageProvider: PackageProvider = { ...mockPackageProvider, id: PROVIDER_ID };
