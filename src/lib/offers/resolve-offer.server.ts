// resolveOffer(canonicalId) — server-only.
//
// DEMO: unchanged behavior, delegated to the existing getDeal() pipeline —
// never touches provider_offer_cache.
//
// SANDBOX/LIVE: decode -> raw row lookup (distinguishes not_found from
// expired) -> provider-id validated against the configured revalidation
// chain (never trusted blindly from the stored/client data) -> hotel AND
// flight revalidated independently via the already-wired
// revalidateLiveHotel/revalidateLiveFlight (live-registry.server.ts) using
// ONLY the server-stored TransientOfferSearchContext -> structured result.
//
// A non-expired cache row is never treated as bookable on its own — every
// SANDBOX/LIVE resolution requires a real provider revalidation call to
// reach "available". See offer-store-pure.ts's file header for the same
// rule stated at the storage layer.

import { fetchDestinationRows } from "@/lib/catalog.server";
import { rowToDestination, type Destination } from "@/lib/catalog";
import { getDeal } from "@/lib/deals";
import { decodeCanonicalId } from "./canonical-id";
import { normalizeDemoDeal } from "./normalize-demo";
import { getRawOfferRow, postgresOfferStore } from "./offer-store.server";
import { DEFAULT_OFFER_TTL_SECONDS } from "./offer-store-pure";
import { deserializeOfferRow, isExpired } from "./offer-store-pure";
import type { CanonicalOffer } from "./canonical-offer";
import type { OfferPriceBreakdown, OfferResolution } from "./resolution";

function resolution(partial: Partial<OfferResolution> & { canonicalId: string }): OfferResolution {
  return {
    status: "not_found",
    sourceMode: "demo",
    previousPrice: null,
    currentPrice: null,
    priceDifference: null,
    priceBreakdown: null,
    verifiedAt: null,
    expiresAt: null,
    reasonCode: null,
    refreshedOffer: null,
    ...partial,
  };
}

async function resolveDemoOffer(
  canonicalId: string,
  providerOfferId: string,
): Promise<OfferResolution> {
  const rows = await fetchDestinationRows();
  const catalog = rows.map(rowToDestination);
  const deal = getDeal(providerOfferId, catalog);

  if (!deal) {
    return resolution({
      canonicalId,
      sourceMode: "demo",
      status: "not_found",
      reasonCode: "row_missing",
    });
  }

  const offer = normalizeDemoDeal(deal);
  return resolution({
    canonicalId: offer.canonicalId,
    sourceMode: "demo",
    status: "available",
    currentPrice: offer.pricing.pricePerPerson,
    priceBreakdown: {
      hotelComponent: null,
      flightComponent: null,
      taxesFees: null,
      total: offer.pricing.totalPrice,
    },
    verifiedAt: offer.verifiedAt,
    expiresAt: null, // demo never expires — it's re-derived deterministically every time
    refreshedOffer: offer,
  });
}

async function findDestination(slug: string): Promise<Destination | null> {
  const rows = await fetchDestinationRows();
  const catalog = rows.map(rowToDestination);
  return catalog.find((d) => d.slug === slug) ?? null;
}

/** True only if `providerId` matches a currently configured member of the given revalidation chain. */
function providerIsConfigured(
  providerId: string,
  chainMembers: { id: string; configured: boolean }[],
): boolean {
  return chainMembers.some((m) => m.id === providerId && m.configured);
}

type ComponentOutcome =
  | { ok: true; perPerson: number }
  | {
      ok: false;
      reason: "sold_out" | "unsupported" | "provider_unavailable" | "reference_missing";
    };

async function resolveLiveOffer(canonicalId: string): Promise<OfferResolution> {
  const decoded = decodeCanonicalId(canonicalId);
  const base = { canonicalId, sourceMode: decoded.sourceMode as "sandbox" | "live" };

  // 1. Raw row lookup — distinguishes "never existed" from "existed but expired".
  const raw = await getRawOfferRow(canonicalId);
  if (!raw) {
    return resolution({ ...base, status: "not_found", reasonCode: "row_missing" });
  }
  if (isExpired(raw.expires_at)) {
    return resolution({ ...base, status: "expired", reasonCode: "row_expired" });
  }

  const stored = deserializeOfferRow(raw);
  if (!stored) {
    return resolution({ ...base, status: "not_found", reasonCode: "row_malformed" });
  }

  const { offer, searchContext } = stored;
  const previousPrice = offer.pricing.pricePerPerson;

  // 2. Provider-id validation — never blindly trusted from stored/client data.
  const registry = await import("@/lib/providers/live-registry.server");
  const hotelMembers = registry.hotelChain();
  const flightMembers = registry.flightChain();

  const hotelProviderOk = providerIsConfigured(offer.providerId, hotelMembers);
  const flightProviderOk = providerIsConfigured(offer.providerId, flightMembers);

  if (!hotelProviderOk && !flightProviderOk) {
    return resolution({
      ...base,
      previousPrice,
      status: "provider_unavailable",
      reasonCode: "provider_mismatch",
      refreshedOffer: offer,
    });
  }

  // 3. Search-context sufficiency — never reconstructed from demo data. Our
  // own catalog metadata (destination name/country code) is fine to look
  // up (source-independent, same pattern already used for region/tags in
  // the /packages migration) — but dates/occupancy must come from the
  // stored context itself, never guessed.
  const destination = await findDestination(searchContext.destinationSlug);
  const hasDates = Boolean(searchContext.outboundDate);

  if (!destination || !hasDates || !searchContext.origin) {
    return resolution({
      ...base,
      previousPrice,
      status: "unsupported",
      reasonCode: "search_context_incomplete",
      refreshedOffer: offer,
    });
  }

  // 4. Revalidate hotel and flight independently — a package is only fully
  // verified when BOTH succeed.
  let hotelResult: ComponentOutcome = { ok: false, reason: "provider_unavailable" };
  let flightResult: ComponentOutcome = { ok: false, reason: "provider_unavailable" };
  let hotelTtlSeconds: number | null = null;
  let flightTtlSeconds: number | null = null;

  if (hotelProviderOk) {
    if (!searchContext.providerRefs.hotelOfferId) {
      hotelResult = { ok: false, reason: "reference_missing" };
    } else {
      const hotelReq = {
        destinationSlug: destination.slug,
        destinationName: destination.name,
        checkIn: searchContext.outboundDate!,
        checkOut: searchContext.returnDate ?? searchContext.outboundDate!,
        adults: searchContext.people,
        rooms: searchContext.rooms ?? 1,
        currency: "ILS" as const,
      };
      const res = await registry.revalidateLiveHotel(
        searchContext.providerRefs.hotelOfferId,
        hotelReq,
      );
      if (!res.ok) {
        hotelResult = {
          ok: false,
          reason: res.error.code === "not_configured" ? "provider_unavailable" : "sold_out",
        };
      } else if (res.data.availability === "sold-out") {
        hotelResult = { ok: false, reason: "sold_out" };
      } else if (!res.data.verified || res.data.perPerson === null) {
        hotelResult = { ok: false, reason: "unsupported" };
      } else {
        hotelResult = { ok: true, perPerson: res.data.perPerson };
        hotelTtlSeconds = res.data.ttlSeconds;
      }
    }
  }

  if (flightProviderOk) {
    if (!searchContext.providerRefs.flightOfferId) {
      flightResult = { ok: false, reason: "reference_missing" };
    } else {
      const flightReq = {
        origin: searchContext.origin,
        destinationCode: destination.countryCode,
        destinationName: destination.name,
        departDate: searchContext.outboundDate!,
        returnDate: searchContext.returnDate,
        adults: searchContext.people,
        currency: "ILS" as const,
      };
      const res = await registry.revalidateLiveFlight(
        searchContext.providerRefs.flightOfferId,
        flightReq,
      );
      if (!res.ok) {
        flightResult = {
          ok: false,
          reason: res.error.code === "not_configured" ? "provider_unavailable" : "sold_out",
        };
      } else if (res.data.availability === "sold-out") {
        flightResult = { ok: false, reason: "sold_out" };
      } else if (!res.data.verified || res.data.perPerson === null) {
        flightResult = { ok: false, reason: "unsupported" };
      } else {
        flightResult = { ok: true, perPerson: res.data.perPerson };
        flightTtlSeconds = res.data.ttlSeconds;
      }
    }
  }

  const result = finalizeResolution({
    base,
    offer,
    previousPrice,
    people: searchContext.people,
    hotelResult,
    flightResult,
  });

  // 5. Store refresh — only on a genuinely successful revalidation
  // (available/price_changed), never on a failed/partial one, so a
  // sold-out or unsupported result never overwrites a still-valid
  // snapshot with something worse. Canonical identity is preserved
  // (same canonicalId — we're updating the row keyed by it, not creating
  // a new one). Best-effort: a write failure here doesn't change the
  // resolution the caller already received.
  if (
    (result.status === "available" || result.status === "price_changed") &&
    result.refreshedOffer
  ) {
    const providerTtls = [hotelTtlSeconds, flightTtlSeconds].filter(
      (t): t is number => typeof t === "number" && t > 0,
    );
    const refreshTtlSeconds =
      providerTtls.length > 0 ? Math.min(...providerTtls) : DEFAULT_OFFER_TTL_SECONDS;
    try {
      await postgresOfferStore.set({
        offer: result.refreshedOffer,
        searchContext,
        ttlSeconds: refreshTtlSeconds,
      });
    } catch (err) {
      console.error(
        `provider_offer_cache refresh failed for ${canonicalId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return result;
}

function finalizeResolution(params: {
  base: { canonicalId: string; sourceMode: "sandbox" | "live" };
  offer: CanonicalOffer;
  previousPrice: number | null;
  people: number;
  hotelResult: ComponentOutcome;
  flightResult: ComponentOutcome;
}): OfferResolution {
  const { base, offer, previousPrice, people, hotelResult, flightResult } = params;

  // Both components must succeed for a fully verified package — this is
  // the explicit rule from the requirements, not an incidental side effect.
  if (!hotelResult.ok || !flightResult.ok) {
    const anySoldOut = [hotelResult, flightResult].some((r) => !r.ok && r.reason === "sold_out");
    const anyProviderUnavailable = [hotelResult, flightResult].some(
      (r) => !r.ok && r.reason === "provider_unavailable",
    );

    const status: OfferResolution["status"] = anySoldOut
      ? "sold_out"
      : anyProviderUnavailable
        ? "provider_unavailable"
        : "unsupported";

    const codeFor = (
      reason: Exclude<ComponentOutcome, { ok: true }>["reason"],
      isHotel: boolean,
    ) => {
      if (reason === "sold_out") return isHotel ? "hotel_sold_out" : "flight_sold_out";
      if (reason === "provider_unavailable") return "provider_not_configured";
      if (reason === "reference_missing")
        return isHotel ? "hotel_reference_missing" : "flight_reference_missing";
      return isHotel ? "hotel_component_unsupported" : "flight_component_unsupported";
    };

    const reasonCode = !hotelResult.ok
      ? codeFor(hotelResult.reason, true)
      : !flightResult.ok
        ? codeFor(flightResult.reason, false)
        : null;

    return resolution({ ...base, previousPrice, status, reasonCode, refreshedOffer: offer });
  }

  const currentPrice = hotelResult.perPerson + flightResult.perPerson;
  const total = currentPrice * Math.max(1, people);
  const priceBreakdown: OfferPriceBreakdown = {
    hotelComponent: hotelResult.perPerson,
    flightComponent: flightResult.perPerson,
    taxesFees: null,
    total,
  };
  const priceChanged = previousPrice !== null && currentPrice !== previousPrice;
  const verifiedAt = new Date().toISOString();

  const refreshedOffer: CanonicalOffer = {
    ...offer,
    pricing: {
      ...offer.pricing,
      pricePerPerson: currentPrice,
      totalPrice: total,
      verified: true,
    },
    verifiedAt,
    availabilityState: "available",
  };

  return resolution({
    ...base,
    previousPrice,
    currentPrice,
    priceDifference: previousPrice !== null ? currentPrice - previousPrice : null,
    priceBreakdown,
    status: priceChanged ? "price_changed" : "available",
    verifiedAt,
    refreshedOffer,
  });
}

export async function resolveOffer(canonicalId: string): Promise<OfferResolution> {
  const decoded = decodeCanonicalId(canonicalId);
  if (decoded.sourceMode === "demo") {
    return resolveDemoOffer(canonicalId, decoded.providerOfferId);
  }
  return resolveLiveOffer(canonicalId);
}
