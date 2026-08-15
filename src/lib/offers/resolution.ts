// Structured resolution result for resolveOffer(). Never a raw provider
// error string — reasonCode is always one of a small, fixed, safe set.

import type { CanonicalOffer, SourceMode } from "./canonical-offer";

export type ResolutionStatus =
  | "available"
  | "price_changed"
  | "availability_changed"
  | "expired"
  | "sold_out"
  | "provider_unavailable"
  | "not_found"
  | "unsupported";

export interface OfferPriceBreakdown {
  hotelComponent: number | null;
  flightComponent: number | null;
  taxesFees: number | null;
  total: number | null;
}

export type ResolutionReasonCode =
  | "row_missing"
  | "row_expired"
  | "row_malformed"
  | "provider_not_configured"
  | "provider_mismatch"
  | "search_context_incomplete"
  | "hotel_sold_out"
  | "flight_sold_out"
  | "hotel_unverified"
  | "flight_unverified"
  | "hotel_component_unsupported"
  | "flight_component_unsupported"
  | "hotel_reference_missing"
  | "flight_reference_missing"
  | "gate_blocked";

export interface OfferResolution {
  status: ResolutionStatus;
  canonicalId: string;
  sourceMode: SourceMode;
  previousPrice: number | null;
  currentPrice: number | null;
  priceDifference: number | null;
  priceBreakdown: OfferPriceBreakdown | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  reasonCode: ResolutionReasonCode | null;
  refreshedOffer: CanonicalOffer | null;
}
