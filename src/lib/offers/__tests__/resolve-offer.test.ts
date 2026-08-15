import { describe, expect, it, vi } from "vitest";
import type { ProviderOfferCacheRow } from "@/lib/offers/offer-store-pure";
import type { CanonicalOffer, TransientOfferSearchContext } from "@/lib/offers/canonical-offer";

function destRow(overrides: Record<string, unknown> = {}) {
  return {
    slug: "santorini",
    name: "סנטוריני",
    country: "יוון",
    country_code: "GR",
    flag: "🇬🇷",
    region: "אירופה",
    tagline: "",
    weather: "",
    flight_hours: 3,
    avg_budget_per_person: 3000,
    matches: ["beach"],
    is_popular: true,
    has_offers: true,
    hotels: [{ name: "מלון", note: "" }],
    attractions: [],
    restaurants: [],
    itinerary: [],
    sort_order: 1,
    city_en: null,
    country_en: null,
    subregion: null,
    airport_codes: null,
    latitude: null,
    longitude: null,
    timezone: null,
    currency: null,
    languages: null,
    image_url: null,
    short_description: null,
    best_travel_months: null,
    average_trip_duration: null,
    travel_categories: null,
    direct_flight_from_tlv: null,
    provider_supported: null,
    demo_supported: null,
    is_featured: null,
    is_trending: null,
    ...overrides,
  };
}

function sampleOffer(overrides: Partial<CanonicalOffer> = {}): CanonicalOffer {
  return {
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    providerId: "acme",
    providerOfferId: "offer-1",
    verifiedAt: "2026-08-01T10:00:00.000Z",
    availabilityState: "available",
    destination: {
      slug: "santorini",
      city: "סנטוריני",
      country: "יוון",
      region: "אירופה",
      coords: null,
    },
    dates: { start: "2026-09-01", end: "2026-09-06", nights: 5 },
    hotel: {
      providerHotelId: "hotel-1",
      name: "Acme Hotel",
      stars: 4,
      guestRating: 8,
      roomRateRef: null,
      board: "unknown",
      cancellationPolicy: { kind: "unknown" },
      refundable: false,
      priceComponent: null,
    },
    flight: {
      outbound: {
        airline: "Acme Air",
        flightNumber: "AC1",
        departAt: null,
        arriveAt: null,
        stops: 0,
        durationMinutes: null,
        baggage: null,
        fareRules: null,
      },
      inbound: {
        airline: "Acme Air",
        flightNumber: "AC1",
        departAt: null,
        arriveAt: null,
        stops: 0,
        durationMinutes: null,
        baggage: null,
        fareRules: null,
      },
      priceComponent: null,
    },
    pricing: {
      pricePerPerson: 4000,
      totalPrice: 8000,
      currency: "ILS",
      taxesFees: null,
      extrasAvailable: false,
      verified: false,
      discountPct: null,
    },
    inclusions: [],
    tags: [],
    nitziScore: null,
    smartPrice: null,
    ...overrides,
  };
}

function sampleContext(
  overrides: Partial<TransientOfferSearchContext> = {},
): TransientOfferSearchContext {
  return {
    destinationSlug: "santorini",
    origin: "TLV",
    outboundDate: "2026-09-01",
    returnDate: "2026-09-06",
    nights: 5,
    people: 2,
    children: null,
    rooms: 1,
    providerId: "acme",
    providerRefs: {
      packageOfferId: "pkg-1",
      hotelOfferId: "hotel-1",
      hotelRateId: null,
      flightOfferId: "flight-1",
      flightFareId: null,
      searchSessionId: null,
    },
    ...overrides,
  };
}

function makeRow(
  offer: CanonicalOffer,
  context: TransientOfferSearchContext,
  expiresAtOffsetMs: number,
): ProviderOfferCacheRow {
  return {
    canonical_id: offer.canonicalId,
    source_mode: offer.sourceMode,
    provider_id: offer.providerId,
    provider_offer_id: offer.providerOfferId,
    offer: offer as unknown,
    search_context: context as unknown,
    created_at: new Date().toISOString(),
    verified_at: offer.verifiedAt,
    expires_at: new Date(Date.now() + expiresAtOffsetMs).toISOString(),
  };
}

const CONFIGURED_ACME_HOTEL_CHAIN = [{ id: "acme", configured: true }];
const CONFIGURED_ACME_FLIGHT_CHAIN = [{ id: "acme", configured: true }];

function verifiedQuote(perPerson: number, overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    providerId: "acme",
    latencyMs: 10,
    data: {
      verified: true,
      perPerson,
      total: perPerson,
      currency: "ILS",
      verifiedAt: new Date().toISOString(),
      ttlSeconds: 300,
      availability: "available",
      unitsLeft: null,
      source: "acme",
      ...overrides,
    },
  };
}

async function loadResolver(mocks: {
  hotelChain?: unknown[];
  flightChain?: unknown[];
  revalidateLiveHotel?: (...args: unknown[]) => unknown;
  revalidateLiveFlight?: (...args: unknown[]) => unknown;
  rawRow?: ProviderOfferCacheRow | null;
  setSpy?: ReturnType<typeof vi.fn>;
  destinations?: ReturnType<typeof destRow>[];
  listDealsSpy?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();
  vi.doMock("@/lib/catalog.server", () => ({
    fetchDestinationRows: async () => mocks.destinations ?? [destRow()],
  }));
  vi.doMock("@/lib/offers/offer-store.server", () => ({
    getRawOfferRow: async () => mocks.rawRow ?? null,
    postgresOfferStore: { get: vi.fn(), set: mocks.setSpy ?? vi.fn().mockResolvedValue(undefined) },
  }));
  vi.doMock("@/lib/providers/live-registry.server", () => ({
    hotelChain: () => mocks.hotelChain ?? [],
    flightChain: () => mocks.flightChain ?? [],
    revalidateLiveHotel:
      mocks.revalidateLiveHotel ?? (async () => ({ ok: false, error: { code: "not_configured" } })),
    revalidateLiveFlight:
      mocks.revalidateLiveFlight ??
      (async () => ({ ok: false, error: { code: "not_configured" } })),
  }));
  if (mocks.listDealsSpy) {
    vi.doMock("@/lib/deals", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/deals")>();
      return { ...actual, listDeals: mocks.listDealsSpy };
    });
  }
  return import("@/lib/offers/resolve-offer.server");
}

describe("resolveOffer — DEMO behavior unchanged", () => {
  it("resolves a legacy bare-slug demo id exactly as getDeal() would", async () => {
    const mod = await loadResolver({ destinations: [destRow()] });
    const result = await mod.resolveOffer("santorini");
    expect(result.sourceMode).toBe("demo");
    expect(result.status).toBe("available");
    expect(result.refreshedOffer?.canonicalId).toBe("demo:nitzi-demo:santorini");
  });

  it("a demo id for a destination not in the catalog resolves not_found", async () => {
    const mod = await loadResolver({ destinations: [destRow()] });
    const result = await mod.resolveOffer("nonexistent-place");
    expect(result.sourceMode).toBe("demo");
    expect(result.status).toBe("not_found");
  });

  it("demo resolution never touches provider_offer_cache", async () => {
    const getRawSpy = vi.fn();
    vi.resetModules();
    vi.doMock("@/lib/catalog.server", () => ({ fetchDestinationRows: async () => [destRow()] }));
    vi.doMock("@/lib/offers/offer-store.server", () => ({
      getRawOfferRow: getRawSpy,
      postgresOfferStore: { get: vi.fn(), set: vi.fn() },
    }));
    const mod = await import("@/lib/offers/resolve-offer.server");
    await mod.resolveOffer("santorini");
    expect(getRawSpy).not.toHaveBeenCalled();
  });
});

describe("resolveOffer — SANDBOX/LIVE lookup and expiry", () => {
  it("missing offer resolves not_found", async () => {
    const mod = await loadResolver({ rawRow: null });
    const result = await mod.resolveOffer("live:acme:offer-1");
    expect(result.status).toBe("not_found");
    expect(result.reasonCode).toBe("row_missing");
  });

  it("expired offer resolves expired, never re-used silently", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), -1000); // already expired
    const mod = await loadResolver({ rawRow: row });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("expired");
    expect(result.reasonCode).toBe("row_expired");
  });

  it("a malformed stored payload resolves not_found, never as available", async () => {
    const row = {
      canonical_id: "live:acme:offer-1",
      source_mode: "live",
      provider_id: "acme",
      provider_offer_id: "offer-1",
      offer: { canonicalId: "live:acme:offer-1" }, // missing pricing/hotel — malformed
      search_context: {},
      created_at: new Date().toISOString(),
      verified_at: null,
      expires_at: new Date(Date.now() + 100000).toISOString(),
    } as unknown as ProviderOfferCacheRow;
    const mod = await loadResolver({ rawRow: row });
    const result = await mod.resolveOffer("live:acme:offer-1");
    expect(result.status).toBe("not_found");
  });
});

describe("resolveOffer — provider validation", () => {
  it("unknown/unconfigured provider resolves provider_unavailable, safely (no crash, no call attempted)", async () => {
    const offer = sampleOffer({ providerId: "totally-unknown-provider" });
    const row = makeRow(offer, sampleContext(), 100000);
    const hotelSpy = vi.fn();
    const flightSpy = vi.fn();
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: [{ id: "acme", configured: true }], // "totally-unknown-provider" isn't in the chain
      flightChain: [{ id: "acme", configured: true }],
      revalidateLiveHotel: hotelSpy,
      revalidateLiveFlight: flightSpy,
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("provider_unavailable");
    expect(result.reasonCode).toBe("provider_mismatch");
    expect(hotelSpy).not.toHaveBeenCalled();
    expect(flightSpy).not.toHaveBeenCalled();
  });

  it("canonicalId tampering (garbage id) produces a safe miss, never a crash", async () => {
    const mod = await loadResolver({ rawRow: null });
    const result = await mod.resolveOffer("live:???:###garbage###");
    expect(result.status).toBe("not_found");
  });
});

describe("resolveOffer — successful revalidation", () => {
  it("both components succeed with unchanged price -> available", async () => {
    const offer = sampleOffer({ pricing: { ...sampleOffer().pricing, pricePerPerson: 4000 } });
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2000),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("available");
    expect(result.currentPrice).toBe(4000);
    expect(result.previousPrice).toBe(4000);
    expect(result.priceBreakdown).toEqual({
      hotelComponent: 2000,
      flightComponent: 2000,
      taxesFees: null,
      total: 8000,
    });
  });

  it("a changed price -> price_changed, preserving the old snapshot price for comparison", async () => {
    const offer = sampleOffer({ pricing: { ...sampleOffer().pricing, pricePerPerson: 4000 } });
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2500),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("price_changed");
    expect(result.previousPrice).toBe(4000);
    expect(result.currentPrice).toBe(4500);
    expect(result.priceDifference).toBe(500);
  });

  it("does not auto-approve/charge — this batch only resolves, never mutates payment/booking state", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2500),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    // The result is purely informational — no booking/payment field exists
    // on OfferResolution at all, structurally proving nothing was mutated.
    expect(result).not.toHaveProperty("bookingId");
    expect(result).not.toHaveProperty("paymentStatus");
    expect(result.status).toBe("price_changed");
  });
});

describe("resolveOffer — availability changes", () => {
  it("flight sold out -> sold_out, never substitutes a different flight", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2000),
      revalidateLiveFlight: async () =>
        verifiedQuote(0, { availability: "sold-out", perPerson: null }),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("sold_out");
    expect(result.reasonCode).toBe("flight_sold_out");
    // Still the same destination/hotel referenced — no silent substitution.
    expect(result.refreshedOffer?.destination.slug).toBe(offer.destination.slug);
  });

  it("hotel unavailable -> sold_out, package not marked verified", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () =>
        verifiedQuote(0, { availability: "sold-out", perPerson: null }),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("sold_out");
    expect(result.reasonCode).toBe("hotel_sold_out");
    expect(result.currentPrice).toBeNull();
  });

  it("unsupported hotel revalidation does not mark the package fully verified, even though flight succeeded", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(0, { verified: false, perPerson: null }),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).not.toBe("available");
    expect(result.status).not.toBe("price_changed");
    expect(result.reasonCode).toBe("hotel_component_unsupported");
  });

  it("both components required — a package is never fully verified from only one succeeding", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    // Only hotel provider configured; flight provider missing from the chain entirely.
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: [], // acme not configured for flights
      revalidateLiveHotel: async () => verifiedQuote(2000),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).not.toBe("available");
    expect(result.status).not.toBe("price_changed");
  });
});

describe("resolveOffer — search context integrity", () => {
  it("returns unsupported (never guesses) when the stored context lacks required dates", async () => {
    const offer = sampleOffer();
    const context = sampleContext({ outboundDate: null });
    const row = makeRow(offer, context, 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
    });
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.status).toBe("unsupported");
    expect(result.reasonCode).toBe("search_context_incomplete");
  });

  it("resolveOffer only ever accepts a canonicalId — there is no channel for client-supplied price/context to influence the result", async () => {
    const offer = sampleOffer({ pricing: { ...sampleOffer().pricing, pricePerPerson: 4000 } });
    const row = makeRow(offer, sampleContext(), 100000);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2000),
      revalidateLiveFlight: async () => verifiedQuote(2000),
    });
    // Function signature is (canonicalId: string) — no second parameter
    // exists for a caller to inject a price/context override.
    expect(mod.resolveOffer.length).toBe(1);
    const result = await mod.resolveOffer(offer.canonicalId);
    expect(result.currentPrice).toBe(4000); // only the mocked provider result, nothing else
  });
});

describe("resolveOffer — store refresh", () => {
  it("a successful revalidation refreshes the stored snapshot with the new price/verifiedAt", async () => {
    const offer = sampleOffer({ pricing: { ...sampleOffer().pricing, pricePerPerson: 4000 } });
    const row = makeRow(offer, sampleContext(), 100000);
    const setSpy = vi.fn().mockResolvedValue(undefined);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2500),
      revalidateLiveFlight: async () => verifiedQuote(2000),
      setSpy,
    });
    await mod.resolveOffer(offer.canonicalId);
    expect(setSpy).toHaveBeenCalled();
    const call = setSpy.mock.calls[0][0];
    expect(call.offer.canonicalId).toBe(offer.canonicalId); // identity preserved
    expect(call.offer.pricing.pricePerPerson).toBe(4500); // refreshed, not stale
  });

  it("a failed/partial revalidation does NOT refresh the store (never overwrites a valid snapshot with a worse one)", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const setSpy = vi.fn().mockResolvedValue(undefined);
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () =>
        verifiedQuote(0, { availability: "sold-out", perPerson: null }),
      revalidateLiveFlight: async () => verifiedQuote(2000),
      setSpy,
    });
    await mod.resolveOffer(offer.canonicalId);
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe("resolveOffer — structural guarantee: sandbox/live never falls back to listDeals()", () => {
  it("listDeals() is never called anywhere in the SANDBOX/LIVE resolution path", async () => {
    const offer = sampleOffer();
    const row = makeRow(offer, sampleContext(), 100000);
    const listDealsSpy = vi.fn();
    const mod = await loadResolver({
      rawRow: row,
      hotelChain: CONFIGURED_ACME_HOTEL_CHAIN,
      flightChain: CONFIGURED_ACME_FLIGHT_CHAIN,
      revalidateLiveHotel: async () => verifiedQuote(2000),
      revalidateLiveFlight: async () => verifiedQuote(2000),
      listDealsSpy,
    });
    await mod.resolveOffer(offer.canonicalId);
    expect(listDealsSpy).not.toHaveBeenCalled();
  });

  it("even a not_found/expired/provider_unavailable SANDBOX/LIVE result never calls listDeals()", async () => {
    const listDealsSpy = vi.fn();
    const mod = await loadResolver({ rawRow: null, listDealsSpy });
    await mod.resolveOffer("live:acme:missing-offer");
    expect(listDealsSpy).not.toHaveBeenCalled();
  });
});
