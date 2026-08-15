// DEMO normalizer — Deal -> CanonicalOffer.
//
// Fields the demo model genuinely has no data for (never guessed):
//  - hotel.providerHotelId (no external hotel id exists in demo data)
//  - hotel.roomRateRef (no source models distinct rooms/rates yet)
//  - flight.*.baggage / flight.*.fareRules (DealFlight has neither field —
//    the "20kg included" text elsewhere is boilerplate copy, not structured
//    data, and is not treated as if it were)
//  - flight.*.flightNumber/departAt/arriveAt ARE present on demo deals, so
//    those map through directly (demo is more complete here than the docs
//    might suggest — verified against DealFlight's actual shape).

import type { Deal } from "@/lib/deals";
import { isValidCoords } from "@/lib/deal-location";
import { nitziScore } from "@/lib/deal-score";
import { smartPrice } from "@/lib/smart-price";
import type { CanonicalFlightLeg, CanonicalOffer } from "./canonical-offer";
import { demoCanonicalId } from "./canonical-id";

function demoLeg(leg: Deal["outbound"]): CanonicalFlightLeg {
  return {
    airline: leg.airline,
    flightNumber: leg.flightNumber,
    departAt: leg.departAt,
    arriveAt: leg.arriveAt,
    stops: leg.stops,
    durationMinutes: leg.durationMinutes,
    baggage: null, // not modeled by DealFlight — never guessed
    fareRules: null, // not modeled by DealFlight — never guessed
  };
}

export function normalizeDemoDeal(deal: Deal): CanonicalOffer {
  const coords = isValidCoords(deal.destination.latitude, deal.destination.longitude)
    ? { lat: deal.destination.latitude as number, lon: deal.destination.longitude as number }
    : null;

  const sp = smartPrice(deal);
  const score = nitziScore(deal);
  const availabilityState: CanonicalOffer["availabilityState"] =
    deal.price.availability === "limited"
      ? "limited"
      : deal.price.availability === "available"
        ? "available"
        : "unavailable"; // covers "sold-out" and "unavailable"

  return {
    canonicalId: demoCanonicalId(deal.id),
    sourceMode: "demo",
    providerId: "nitzi-demo",
    providerOfferId: deal.id,
    verifiedAt: deal.price.verifiedAt,
    availabilityState,

    destination: {
      slug: deal.destination.slug,
      city: deal.destination.name,
      country: deal.destination.country,
      region: deal.destination.region,
      coords,
    },

    dates: { start: deal.dates.start, end: deal.dates.end, nights: deal.dates.nights },

    hotel: {
      providerHotelId: null,
      name: deal.hotel.name,
      stars: deal.hotel.stars,
      guestRating: deal.hotel.guestRating,
      roomRateRef: null,
      board: deal.board,
      cancellationPolicy: deal.cancellationPolicy,
      refundable: deal.freeCancellation,
      priceComponent: null, // demo doesn't separate hotel vs flight price components
    },

    flight: {
      outbound: demoLeg(deal.outbound),
      inbound: demoLeg(deal.inbound),
      priceComponent: null,
    },

    pricing: {
      pricePerPerson: deal.price.perPerson,
      totalPrice: deal.price.total,
      currency: "ILS",
      taxesFees: null,
      extrasAvailable: true,
      verified: true, // demo deals are always internally consistent/"verified" by construction
      discountPct: deal.discountPct,
    },

    inclusions: deal.includes,
    tags: deal.destination.matches,
    nitziScore: score.value,
    smartPrice: sp ? { level: sp.level, label: sp.label } : null,
  };
}
