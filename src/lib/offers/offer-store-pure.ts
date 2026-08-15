// Pure logic for the durable provider offer store — deliberately separated
// from the Postgres transport (offer-store.server.ts) so TTL, validation,
// and serialization behavior can be unit-tested without a database.
//
// IMPORTANT DATA-INTEGRITY RULE: a row existing here, even unexpired, is a
// SEARCH SNAPSHOT — never proof of current price, availability, or
// cancellation terms. It exists only so a later batch's revalidation step
// has something to revalidate. Nothing in this file marks an offer as
// "verified" — that word only ever means what CanonicalOffer.pricing.verified
// already meant (set by the normalizer from the provider's own response),
// never something this store adds on its own.

import type { CanonicalOffer, SourceMode, TransientOfferSearchContext } from "./canonical-offer";

/** No implicit/default TTL exists at the database level (expires_at is NOT NULL,
 *  no column default) — the application always supplies an explicit value.
 *  This is the conservative default used when the provider response itself
 *  gives no expiry/TTL signal (the active provider layer — types.ts's
 *  Package/Hotel/Flight — has no such field today). Documented, not hidden:
 *  10 minutes is short enough that a stale price is unlikely to have moved
 *  far, long enough to cover a normal browse-then-click flow. */
export const DEFAULT_OFFER_TTL_SECONDS = 600;

export interface ProviderOfferCacheRow {
  canonical_id: string;
  source_mode: string;
  provider_id: string;
  provider_offer_id: string;
  offer: unknown;
  search_context: unknown;
  created_at: string;
  verified_at: string | null;
  expires_at: string;
}

export interface StoredOffer {
  offer: CanonicalOffer;
  searchContext: TransientOfferSearchContext;
  verifiedAt: string | null;
}

/** DEMO must never reach this store — enforced at the type level (SourceMode
 *  narrowed here) AND at the database level (a CHECK constraint on
 *  source_mode in the migration) — two independent guarantees, not one. */
export type PersistableSourceMode = Exclude<SourceMode, "demo">;

export function isPersistableSourceMode(mode: SourceMode): mode is PersistableSourceMode {
  return mode === "sandbox" || mode === "live";
}

export function isExpired(expiresAtIso: string, now: Date = new Date()): boolean {
  const expiresAt = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresAt)) return true; // malformed timestamp — treat as expired, never as valid
  return expiresAt <= now.getTime();
}

export function computeExpiresAt(ttlSeconds: number, now: Date = new Date()): string {
  const safeTtl =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : DEFAULT_OFFER_TTL_SECONDS;
  return new Date(now.getTime() + safeTtl * 1000).toISOString();
}

export function serializeOfferRow(params: {
  offer: CanonicalOffer;
  searchContext: TransientOfferSearchContext;
  ttlSeconds: number;
  now?: Date;
}): ProviderOfferCacheRow {
  const { offer, searchContext, ttlSeconds, now = new Date() } = params;
  if (!isPersistableSourceMode(offer.sourceMode)) {
    // Structural guardrail, not just a runtime check the caller might skip —
    // callers should never reach this with a demo offer (see
    // active-offers.server.ts), but this makes the invariant load-bearing
    // rather than merely conventional.
    throw new Error(
      `refusing to persist a "${offer.sourceMode}" offer to the LIVE/SANDBOX offer cache`,
    );
  }
  return {
    canonical_id: offer.canonicalId,
    source_mode: offer.sourceMode,
    provider_id: offer.providerId,
    provider_offer_id: offer.providerOfferId,
    offer: offer as unknown,
    search_context: searchContext as unknown,
    created_at: now.toISOString(),
    verified_at: offer.verifiedAt,
    expires_at: computeExpiresAt(ttlSeconds, now),
  };
}

/**
 * Returns null (a clean miss) for anything that isn't a well-formed,
 * unexpired row — malformed payloads fail safely rather than throwing or
 * returning a partially-trusted object.
 */
export function deserializeOfferRow(
  row: ProviderOfferCacheRow | null | undefined,
  now: Date = new Date(),
): StoredOffer | null {
  if (!row) return null;
  if (isExpired(row.expires_at, now)) return null;

  const offer = row.offer;
  const rawSearchContext = row.search_context;
  if (!offer || typeof offer !== "object") return null;
  if (!rawSearchContext || typeof rawSearchContext !== "object") return null;
  const candidate = offer as Partial<CanonicalOffer>;
  if (
    typeof candidate.canonicalId !== "string" ||
    typeof candidate.sourceMode !== "string" ||
    !candidate.pricing ||
    !candidate.hotel
  ) {
    return null; // malformed — never returned as if it were trustworthy
  }

  // Backward-tolerant: a row written before this batch's providerRefs/
  // children/nights fields existed still deserializes — missing
  // references simply resolve as "reference_missing" downstream rather
  // than being treated as a malformed row.
  const rawContext = rawSearchContext as Partial<TransientOfferSearchContext>;
  const searchContext: TransientOfferSearchContext = {
    destinationSlug: rawContext.destinationSlug ?? "",
    origin: rawContext.origin ?? null,
    outboundDate: rawContext.outboundDate ?? null,
    returnDate: rawContext.returnDate ?? null,
    nights: rawContext.nights ?? null,
    people: rawContext.people ?? 1,
    children: rawContext.children ?? null,
    rooms: rawContext.rooms ?? null,
    providerId: rawContext.providerId ?? "",
    providerRefs: rawContext.providerRefs ?? {
      packageOfferId: null,
      hotelOfferId: null,
      hotelRateId: null,
      flightOfferId: null,
      flightFareId: null,
      searchSessionId: null,
    },
  };

  return {
    offer: offer as CanonicalOffer,
    searchContext,
    verifiedAt: row.verified_at,
  };
}
