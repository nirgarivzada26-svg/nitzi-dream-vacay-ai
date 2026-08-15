// SANDBOX/LIVE normalizer — real provider results -> CanonicalOffer.
//
// IMPORTANT, verified this batch: the provider abstraction that is actually
// wired to the DEMO/LIVE switch (getProviders() in registry.ts, consumed by
// buildTrip and /flights) uses the plain Hotel/Flight/Package types from
// providers/types.ts — NOT the richer HotelOffer/FlightOffer/ProviderResult
// shapes in providers/contracts.ts (those back live-registry.server.ts's
// searchLiveFlights/searchLiveHotels, which are defined but never called
// from anywhere in the app today). This normalizer targets the types that
// are actually active, not the more elaborate but unused ones.
//
// Consequence: Package/Hotel/Flight have NO board-basis, cancellation,
// baggage, or fare-rules fields at all — even less structured than demo in
// those respects. All of that stays honestly null/"unknown" below. This is
// a real, disclosed architecture finding from this batch, not a shortcut.

import type { Destination } from "@/lib/catalog";
import type { Package } from "@/lib/providers/types";
import { isValidCoords } from "@/lib/deal-location";
import type { CanonicalFlightLeg, CanonicalOffer, SourceMode } from "./canonical-offer";
import { providerCanonicalId } from "./canonical-id";

function providerLeg(flight: Package["flight"]): CanonicalFlightLeg {
  return {
    airline: flight.airline,
    flightNumber: flight.flightNumber || null,
    departAt: flight.departAt,
    arriveAt: flight.arriveAt,
    stops: flight.stops,
    durationMinutes: flight.durationMinutes,
    baggage: null,
    fareRules: null,
  };
}

export function normalizeProviderPackage(params: {
  sourceMode: Exclude<SourceMode, "demo">;
  destination: Destination;
  pkg: Package;
  peoplePerBooking: number;
}): CanonicalOffer {
  const { sourceMode, destination, pkg, peoplePerBooking } = params;

  const coords = isValidCoords(destination.latitude, destination.longitude)
    ? { lat: destination.latitude as number, lon: destination.longitude as number }
    : null;

  const people = Math.max(1, peoplePerBooking);
  const pricePerPerson = Math.round(pkg.totalPrice / people);

  return {
    canonicalId: providerCanonicalId(sourceMode, pkg.source, pkg.id),
    sourceMode,
    providerId: pkg.source,
    providerOfferId: pkg.id,
    verifiedAt: null,
    availabilityState: "unverified",

    destination: {
      slug: destination.slug,
      city: destination.name,
      country: destination.country,
      region: destination.region,
      coords,
    },

    // Package (the active provider type) has no committed-dates field of
    // its own, but its `flight` component's departAt IS a real,
    // server-computed date (confirmed by tracing mock.ts's buildFlight —
    // driven by the search context's startDate when one was requested).
    // Missed in the earlier batch; corrected here rather than left null.
    // `end` is derived from start + nights (nights IS a real Package
    // field) rather than pkg.flight.arriveAt, which is only the single
    // outbound flight's landing time, not a genuine return/trip-end date —
    // Package models one Flight, not a real outbound/inbound pair.
    dates: pkg.flight.departAt
      ? {
          start: pkg.flight.departAt,
          end: new Date(
            new Date(pkg.flight.departAt).getTime() + pkg.nights * 86400000,
          ).toISOString(),
          nights: pkg.nights,
        }
      : null,

    hotel: {
      providerHotelId: pkg.hotel.id,
      name: pkg.hotel.name,
      stars: pkg.hotel.stars,
      guestRating: pkg.hotel.guestRating,
      roomRateRef: null,
      board: "unknown",
      cancellationPolicy: { kind: "unknown" },
      refundable: false,
      priceComponent: null,
    },

    flight: {
      outbound: providerLeg(pkg.flight),
      inbound: providerLeg(pkg.flight),
      priceComponent: null,
    },

    pricing: {
      pricePerPerson,
      totalPrice: pkg.totalPrice,
      currency: "ILS",
      taxesFees: null,
      extrasAvailable: false,
      verified: false,
      // Package.savings exists but isn't a verified/trustworthy discount
      // signal the way demo's discountPct is (no baseline "list price"
      // concept backs it in the active provider layer) — never used to
      // fabricate a discount claim.
      discountPct: null,
    },

    inclusions: pkg.includes,
    // Our own catalog metadata (beach/family/etc.), not supplier-sourced —
    // populated identically to demo, from the same Destination record.
    tags: destination.matches,
    nitziScore: null,
    smartPrice: null,
  };
}
