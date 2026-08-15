// Canonical Offer Layer — the one normalized offer shape the customer-facing
// product should consume, regardless of whether it came from DEMO, SANDBOX,
// or LIVE inventory. See normalize-demo.ts / normalize-provider.ts for the
// two producers, and active-offers.server.ts for the mode-aware source.
//
// Fields the current data model genuinely cannot populate stay null/"unknown"
// — never fabricated. See each normalizer's comments for exactly which
// fields fall into that bucket today.

import type { CancellationPolicy } from "@/lib/cancellation-policy";
import type { BoardBasis } from "@/lib/deals";

export type SourceMode = "demo" | "sandbox" | "live";

export type AvailabilityState = "available" | "limited" | "unavailable" | "unverified";

export interface CanonicalCoords {
  lat: number;
  lon: number;
}

export interface CanonicalFlightLeg {
  airline: string;
  flightNumber: string | null;
  departAt: string | null;
  arriveAt: string | null;
  stops: number;
  durationMinutes: number | null;
  /** null when the source (today: demo) has no structured baggage data — never guessed. */
  baggage: { checkedKg: number | null; carryOnKg: number | null } | null;
  /** null when the source has no structured fare-rule text — never invented. */
  fareRules: string[] | null;
}

/**
 * Provider identifiers actually available from the active search layer
 * (types.ts/mock.ts), classified honestly:
 *  - packageOfferId/hotelOfferId/flightOfferId: SEARCH_RESULT_ID_ONLY —
 *    deterministic within one search call, but not a proven supplier-issued
 *    stable revalidation token (see the Supplier Search Context batch's
 *    trace of mock.ts: these are `mock-{type}-{idx}-{destinationName}`
 *    strings, not real supplier references).
 *  - hotelRateId/flightFareId/searchSessionId: no such concept exists
 *    anywhere in the currently-wired provider layer — always null, never
 *    invented. A room/rate array, a fare-class id, and a search/session
 *    token are all genuinely absent from types.ts today.
 * flightNumber (a real, correct DISPLAY field on CanonicalFlightLeg) is
 * never used here as a stand-in for flightOfferId — a human-readable
 * flight number is not a supplier revalidation reference.
 */
export interface ProviderRefs {
  packageOfferId: string | null;
  hotelOfferId: string | null;
  hotelRateId: string | null;
  flightOfferId: string | null;
  flightFareId: string | null;
  searchSessionId: string | null;
}

/**
 * Enough server-side search context to later revalidate a SANDBOX/LIVE
 * offer without trusting the browser. Persisted alongside the offer
 * snapshot in the durable offer store (see offer-store.server.ts). Fields
 * the active provider layer genuinely has no equivalent for stay null —
 * never fabricated.
 */
export interface TransientOfferSearchContext {
  destinationSlug: string;
  origin: string | null;
  outboundDate: string | null;
  returnDate: string | null;
  nights: number | null;
  people: number;
  /** Not modeled by the active provider search yet (QuizAnswers has no children field). */
  children: number | null;
  /** Not modeled by the active provider search yet (types.ts has no room-count field). */
  rooms: number | null;
  providerId: string;
  providerRefs: ProviderRefs;
}

export interface CanonicalOffer {
  canonicalId: string;
  sourceMode: SourceMode;
  providerId: string;
  providerOfferId: string;
  verifiedAt: string | null;
  availabilityState: AvailabilityState;

  destination: {
    slug: string;
    city: string;
    country: string;
    /** Our own catalog metadata, not supplier-sourced — populated identically regardless of sourceMode. */
    region: string;
    coords: CanonicalCoords | null;
  };

  /** null when no departure/return date exists yet for this offer (e.g. a live provider result with no committed dates). */
  dates: { start: string; end: string; nights: number } | null;

  hotel: {
    /** External hotel identifier from a real supplier — null for demo (no such id exists). */
    providerHotelId: string | null;
    name: string;
    stars: number;
    guestRating: number | null;
    /** No source (demo or live) models distinct rooms/rates today — always null for now. */
    roomRateRef: string | null;
    board: BoardBasis | "unknown";
    cancellationPolicy: CancellationPolicy;
    refundable: boolean;
    priceComponent: number | null;
  };

  flight: {
    outbound: CanonicalFlightLeg;
    inbound: CanonicalFlightLeg;
    priceComponent: number | null;
  } | null;

  pricing: {
    pricePerPerson: number | null;
    totalPrice: number | null;
    currency: "ILS";
    taxesFees: number | null;
    extrasAvailable: boolean;
    verified: boolean;
    /** null when the source has no trustworthy discount/list-price concept — never invented. */
    discountPct: number | null;
  };

  inclusions: string[];
  tags: string[];
  nitziScore: number | null;
  smartPrice: { level: string; label: string } | null;
}
