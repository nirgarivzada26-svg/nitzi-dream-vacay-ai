import { describe, expect, it, vi } from "vitest";
import { rowToDestination, type Destination, type DestinationRow } from "@/lib/catalog";
import { normalizeProviderPackage } from "@/lib/offers/normalize-provider";
import { deserializeOfferRow, serializeOfferRow } from "@/lib/offers/offer-store-pure";
import type { CanonicalOffer, TransientOfferSearchContext } from "@/lib/offers/canonical-offer";
import type { Package } from "@/lib/providers/types";

function destRow(overrides: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד",
    country: "מדינה",
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

function samplePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: "mock-pkg-0-Santorini",
    title: "t",
    hotel: {
      id: "mock-hotel-0-Santorini",
      name: "Grand Santorini Suites",
      stars: 4,
      guestRating: 8.2,
      reviewsCount: 300,
      pricePerNight: 400,
      currency: "ILS",
      location: "Santorini, Greece",
      amenities: ["pool", "wifi"],
      source: "mock",
    },
    flight: {
      id: "mock-flight-0-Santorini",
      airline: "אל על",
      flightNumber: "LY734",
      origin: "TLV",
      destination: "Santorini",
      departAt: "2026-09-21T08:00:00.000Z",
      arriveAt: "2026-09-21T10:30:00.000Z",
      durationMinutes: 150,
      stops: 0,
      price: 600,
      currency: "ILS",
      source: "mock",
    },
    nights: 5,
    totalPrice: 5000,
    separatePrice: 5800,
    savings: 800,
    includes: ["5 לילות", "טיסה הלוך-חזור"],
    rating: 8.5,
    source: "mock",
    ...overrides,
  };
}

describe("normalizeProviderPackage — dates preserved from the real provider search output", () => {
  it("populates offer.dates from Package.flight.departAt + nights, not left null when the data is real", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });

    expect(offer.dates).not.toBeNull();
    expect(offer.dates?.start).toBe(pkg.flight.departAt);
    expect(offer.dates?.nights).toBe(pkg.nights);
    const expectedEnd = new Date(
      new Date(pkg.flight.departAt).getTime() + pkg.nights * 86400000,
    ).toISOString();
    expect(offer.dates?.end).toBe(expectedEnd);
    expect(offer.dates?.end).not.toBe(pkg.flight.arriveAt);
  });
});

function buildSearchContext(pkg: Package, offer: CanonicalOffer): TransientOfferSearchContext {
  return {
    destinationSlug: offer.destination.slug,
    origin: "TLV",
    outboundDate: offer.dates?.start ?? null,
    returnDate: offer.dates?.end ?? null,
    nights: offer.dates?.nights ?? pkg.nights,
    people: 2,
    children: null,
    rooms: null,
    providerId: offer.providerId,
    providerRefs: {
      packageOfferId: pkg.id,
      hotelOfferId: pkg.hotel.id,
      hotelRateId: null,
      flightOfferId: pkg.flight.id,
      flightFareId: null,
      searchSessionId: null,
    },
  };
}

describe("Supplier search context — real ids, never display-only fields, never fabricated", () => {
  it("preserves the real provider package/hotel/flight ids", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });
    const ctx = buildSearchContext(pkg, offer);

    expect(ctx.providerRefs.packageOfferId).toBe(pkg.id);
    expect(ctx.providerRefs.hotelOfferId).toBe(pkg.hotel.id);
    expect(ctx.providerRefs.flightOfferId).toBe(pkg.flight.id);
  });

  it("NEVER uses the display flight number as the flight revalidation reference", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });
    const ctx = buildSearchContext(pkg, offer);

    expect(ctx.providerRefs.flightOfferId).not.toBe(pkg.flight.flightNumber);
    expect(ctx.providerRefs.flightOfferId).not.toBe("LY734");
  });

  it("honestly reports null for hotelRateId/flightFareId/searchSessionId — no such concept exists in the active provider layer", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });
    const ctx = buildSearchContext(pkg, offer);

    expect(ctx.providerRefs.hotelRateId).toBeNull();
    expect(ctx.providerRefs.flightFareId).toBeNull();
    expect(ctx.providerRefs.searchSessionId).toBeNull();
  });

  it("preserves dates/origin/people/nights in the search context", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });
    const ctx = buildSearchContext(pkg, offer);

    expect(ctx.outboundDate).toBe(pkg.flight.departAt);
    expect(ctx.nights).toBe(pkg.nights);
    expect(ctx.origin).toBe("TLV");
    expect(ctx.people).toBe(2);
  });
});

describe("Stored snapshot round-trip — all provider refs/context survive serialize/deserialize", () => {
  it("preserves providerRefs exactly through a store round-trip", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });
    const context = buildSearchContext(pkg, offer);

    const row = serializeOfferRow({ offer, searchContext: context, ttlSeconds: 600 });
    const result = deserializeOfferRow(row, new Date());

    expect(result?.searchContext.providerRefs).toEqual(context.providerRefs);
    expect(result?.searchContext.outboundDate).toBe(context.outboundDate);
    expect(result?.searchContext.nights).toBe(context.nights);
  });

  it("deserialization is backward-tolerant: a row stored before providerRefs existed still deserializes, with honestly-null refs rather than failing", () => {
    const destination = rowToDestination(destRow({ slug: "santorini" }));
    const pkg = samplePackage();
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });

    const oldShapedRow = {
      canonical_id: offer.canonicalId,
      source_mode: offer.sourceMode,
      provider_id: offer.providerId,
      provider_offer_id: offer.providerOfferId,
      offer: offer as unknown,
      search_context: { destinationSlug: "santorini", origin: "TLV", people: 2 } as unknown,
      created_at: new Date().toISOString(),
      verified_at: null,
      expires_at: new Date(Date.now() + 100000).toISOString(),
    };

    const result = deserializeOfferRow(oldShapedRow, new Date());
    expect(result).not.toBeNull();
    expect(result?.searchContext.providerRefs).toEqual({
      packageOfferId: null,
      hotelOfferId: null,
      hotelRateId: null,
      flightOfferId: null,
      flightFareId: null,
      searchSessionId: null,
    });
  });
});

function offerFixture(): CanonicalOffer {
  const destination = rowToDestination(destRow({ slug: "santorini" }));
  const pkg = samplePackage();
  return normalizeProviderPackage({ sourceMode: "live", destination, pkg, peoplePerBooking: 2 });
}

async function loadResolver(mocks: {
  rawRow: unknown;
  hotelChain?: unknown[];
  flightChain?: unknown[];
  revalidateLiveHotel?: (...args: unknown[]) => unknown;
  revalidateLiveFlight?: (...args: unknown[]) => unknown;
}) {
  vi.resetModules();
  vi.doMock("@/lib/catalog.server", () => ({
    fetchDestinationRows: async () => [destRow({ slug: "santorini" })],
  }));
  vi.doMock("@/lib/offers/offer-store.server", () => ({
    getRawOfferRow: async () => mocks.rawRow,
    postgresOfferStore: { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) },
  }));
  vi.doMock("@/lib/providers/live-registry.server", () => ({
    hotelChain: () => mocks.hotelChain ?? [{ id: "mock", configured: true }],
    flightChain: () => mocks.flightChain ?? [{ id: "mock", configured: true }],
    revalidateLiveHotel:
      mocks.revalidateLiveHotel ??
      (async () => ({
        ok: true,
        data: { verified: true, perPerson: 2000, availability: "available", ttlSeconds: 300 },
      })),
    revalidateLiveFlight:
      mocks.revalidateLiveFlight ??
      (async () => ({
        ok: true,
        data: { verified: true, perPerson: 2000, availability: "available", ttlSeconds: 300 },
      })),
  }));
  return import("@/lib/offers/resolve-offer.server");
}

describe("resolveOffer — missing revalidation reference produces a precise, safe reasonCode", () => {
  it("a missing flightOfferId never falls through to using the display flight number — resolves flight_reference_missing", async () => {
    const offer = offerFixture();
    const context: TransientOfferSearchContext = {
      destinationSlug: "santorini",
      origin: "TLV",
      outboundDate: offer.dates!.start,
      returnDate: offer.dates!.end,
      nights: offer.dates!.nights,
      people: 2,
      children: null,
      rooms: null,
      providerId: "mock",
      providerRefs: {
        packageOfferId: "pkg-0",
        hotelOfferId: "hotel-0",
        hotelRateId: null,
        flightOfferId: null,
        flightFareId: null,
        searchSessionId: null,
      },
    };
    const flightSpy = vi.fn();
    const mod = await loadResolver({
      rawRow: {
        canonical_id: offer.canonicalId,
        source_mode: "live",
        provider_id: "mock",
        provider_offer_id: offer.providerOfferId,
        offer: offer as unknown,
        search_context: context as unknown,
        created_at: new Date().toISOString(),
        verified_at: null,
        expires_at: new Date(Date.now() + 100000).toISOString(),
      },
      revalidateLiveFlight: flightSpy,
    });
    const result = await mod.resolveOffer(offer.canonicalId);

    expect(flightSpy).not.toHaveBeenCalled();
    expect(result.status).not.toBe("available");
    expect(result.reasonCode).toBe("flight_reference_missing");
  });

  it("a missing hotelOfferId resolves hotel_reference_missing without attempting a call", async () => {
    const offer = offerFixture();
    const context: TransientOfferSearchContext = {
      destinationSlug: "santorini",
      origin: "TLV",
      outboundDate: offer.dates!.start,
      returnDate: offer.dates!.end,
      nights: offer.dates!.nights,
      people: 2,
      children: null,
      rooms: null,
      providerId: "mock",
      providerRefs: {
        packageOfferId: "pkg-0",
        hotelOfferId: null,
        hotelRateId: null,
        flightOfferId: "flight-0",
        flightFareId: null,
        searchSessionId: null,
      },
    };
    const hotelSpy = vi.fn();
    const mod = await loadResolver({
      rawRow: {
        canonical_id: offer.canonicalId,
        source_mode: "live",
        provider_id: "mock",
        provider_offer_id: offer.providerOfferId,
        offer: offer as unknown,
        search_context: context as unknown,
        created_at: new Date().toISOString(),
        verified_at: null,
        expires_at: new Date(Date.now() + 100000).toISOString(),
      },
      revalidateLiveHotel: hotelSpy,
    });
    const result = await mod.resolveOffer(offer.canonicalId);

    expect(hotelSpy).not.toHaveBeenCalled();
    expect(result.reasonCode).toBe("hotel_reference_missing");
  });
});

describe("SANDBOX/LIVE never falls back to listDeals() — re-verified against the updated getActiveOffers()", () => {
  it("the updated search-context construction still never touches listDeals()", async () => {
    vi.resetModules();
    process.env.NITZI_OPERATING_MODE = "live";
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [destRow({ slug: "santorini" })],
    }));
    const listDealsSpy = vi.fn();
    vi.doMock("@/lib/deals", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/deals")>();
      return { ...actual, listDeals: listDealsSpy };
    });
    vi.doMock("@/lib/offers/offer-store.server", () => ({
      getRawOfferRow: vi.fn(),
      postgresOfferStore: { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) },
    }));
    vi.doMock("@/lib/providers/registry", () => ({
      getProviders: () => ({
        packages: { id: "mock", search: async () => [samplePackage()] },
      }),
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    expect(listDealsSpy).not.toHaveBeenCalled();
    expect(result.sourceMode).toBe("live");
    expect(result.offers.length).toBeGreaterThan(0);

    delete process.env.NITZI_OPERATING_MODE;
    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/deals");
    vi.doUnmock("@/lib/offers/offer-store.server");
    vi.doUnmock("@/lib/providers/registry");
  });
});
