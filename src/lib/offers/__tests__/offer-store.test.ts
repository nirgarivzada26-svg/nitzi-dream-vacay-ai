import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OFFER_TTL_SECONDS,
  computeExpiresAt,
  deserializeOfferRow,
  isExpired,
  isPersistableSourceMode,
  serializeOfferRow,
  type ProviderOfferCacheRow,
} from "@/lib/offers/offer-store-pure";
import type { CanonicalOffer, TransientOfferSearchContext } from "@/lib/offers/canonical-offer";
import { nullOfferStore } from "@/lib/offers/offer-store";

function sampleOffer(overrides: Partial<CanonicalOffer> = {}): CanonicalOffer {
  return {
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    providerId: "acme",
    providerOfferId: "offer-1",
    verifiedAt: "2026-08-10T10:00:00.000Z",
    availabilityState: "available",
    destination: {
      slug: "santorini",
      city: "סנטוריני",
      country: "יוון",
      region: "אירופה",
      coords: null,
    },
    dates: null,
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
    outboundDate: null,
    returnDate: null,
    nights: null,
    people: 2,
    children: null,
    rooms: null,
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

describe("isPersistableSourceMode / persist guard", () => {
  it("demo is never persistable", () => {
    expect(isPersistableSourceMode("demo")).toBe(false);
  });
  it("sandbox and live are persistable", () => {
    expect(isPersistableSourceMode("sandbox")).toBe(true);
    expect(isPersistableSourceMode("live")).toBe(true);
  });

  it("serializeOfferRow throws (structural guard) if ever given a demo offer", () => {
    const demoOffer = sampleOffer({ sourceMode: "demo", canonicalId: "demo:nitzi-demo:santorini" });
    expect(() =>
      serializeOfferRow({ offer: demoOffer, searchContext: sampleContext(), ttlSeconds: 600 }),
    ).toThrow(/demo/i);
  });
});

describe("TTL / expiry", () => {
  it("computeExpiresAt uses the given TTL", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const expires = computeExpiresAt(300, now);
    expect(expires).toBe("2026-08-10T10:05:00.000Z");
  });

  it("computeExpiresAt falls back to the documented conservative default for invalid input", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const expires = computeExpiresAt(-5, now);
    const expected = new Date(now.getTime() + DEFAULT_OFFER_TTL_SECONDS * 1000).toISOString();
    expect(expires).toBe(expected);
  });

  it("isExpired is false for a future timestamp", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    expect(isExpired("2026-08-10T10:10:00.000Z", now)).toBe(false);
  });

  it("isExpired is true for a past timestamp — a read of it must behave as a miss", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    expect(isExpired("2026-08-10T09:59:59.000Z", now)).toBe(true);
  });

  it("isExpired treats a malformed timestamp as expired, never as valid", () => {
    expect(isExpired("not-a-date")).toBe(true);
  });
});

describe("serialize / deserialize round-trip", () => {
  it("preserves the canonical id exactly", () => {
    const offer = sampleOffer();
    const row = serializeOfferRow({ offer, searchContext: sampleContext(), ttlSeconds: 600 });
    expect(row.canonical_id).toBe(offer.canonicalId);

    const result = deserializeOfferRow(row, new Date("2026-08-10T10:00:00.000Z"));
    expect(result?.offer.canonicalId).toBe(offer.canonicalId);
  });

  it("preserves the CanonicalOffer correctly, including nested pricing/hotel/flight fields", () => {
    const offer = sampleOffer({ pricing: { ...sampleOffer().pricing, pricePerPerson: 5555 } });
    const row = serializeOfferRow({ offer, searchContext: sampleContext(), ttlSeconds: 600 });
    const result = deserializeOfferRow(row, new Date("2026-08-10T10:00:00.000Z"));

    expect(result?.offer).toEqual(offer);
  });

  it("preserves the search context exactly", () => {
    const context = sampleContext({ outboundDate: "2026-09-01", returnDate: "2026-09-06" });
    const row = serializeOfferRow({
      offer: sampleOffer(),
      searchContext: context,
      ttlSeconds: 600,
    });
    const result = deserializeOfferRow(row, new Date("2026-08-10T10:00:00.000Z"));

    expect(result?.searchContext).toEqual(context);
  });

  it("a read before expiry succeeds", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const row = serializeOfferRow({
      offer: sampleOffer(),
      searchContext: sampleContext(),
      ttlSeconds: 600,
      now,
    });
    const justBeforeExpiry = new Date(now.getTime() + 599_000);
    expect(deserializeOfferRow(row, justBeforeExpiry)).not.toBeNull();
  });

  it("a read after expiry returns a miss (null), never a stale offer", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const row = serializeOfferRow({
      offer: sampleOffer(),
      searchContext: sampleContext(),
      ttlSeconds: 600,
      now,
    });
    const afterExpiry = new Date(now.getTime() + 601_000);
    expect(deserializeOfferRow(row, afterExpiry)).toBeNull();
  });

  it("a malformed stored payload fails safely (returns null, never throws or returns a partial object)", () => {
    const now = new Date("2026-08-10T10:00:00.000Z");
    const validRow = serializeOfferRow({
      offer: sampleOffer(),
      searchContext: sampleContext(),
      ttlSeconds: 600,
      now,
    });

    const missingPricing: ProviderOfferCacheRow = {
      ...validRow,
      offer: { canonicalId: "live:acme:x", sourceMode: "live" }, // no pricing/hotel — malformed
    };
    expect(deserializeOfferRow(missingPricing, now)).toBeNull();

    const nullOffer: ProviderOfferCacheRow = { ...validRow, offer: null };
    expect(deserializeOfferRow(nullOffer, now)).toBeNull();

    const garbageContext: ProviderOfferCacheRow = { ...validRow, search_context: "not-an-object" };
    expect(deserializeOfferRow(garbageContext, now)).toBeNull();
  });

  it("a missing row (undefined/null input) is a clean miss", () => {
    expect(deserializeOfferRow(null)).toBeNull();
    expect(deserializeOfferRow(undefined)).toBeNull();
  });
});

describe("nullOfferStore — explicit always-miss implementation", () => {
  it("get() always returns null", async () => {
    expect(await nullOfferStore.get("anything")).toBeNull();
  });

  it("set() never throws and does not persist anything observable", async () => {
    await expect(
      nullOfferStore.set({ offer: sampleOffer(), searchContext: sampleContext(), ttlSeconds: 600 }),
    ).resolves.toBeUndefined();
  });
});

describe("DEMO never writes to the provider offer store", () => {
  it("getActiveOffers() in demo mode never calls the offer store's set()", async () => {
    vi.resetModules();
    delete process.env.NITZI_OPERATING_MODE;
    delete process.env.NITZI_LIVE_MODE;

    const setSpy = vi.fn();
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [
        {
          slug: "demo-store-dest",
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
        },
      ],
    }));
    vi.doMock("@/lib/offers/offer-store.server", () => ({
      postgresOfferStore: { get: vi.fn(), set: setSpy },
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    expect(result.sourceMode).toBe("demo");
    expect(setSpy).not.toHaveBeenCalled();

    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/offers/offer-store.server");
  });

  it("SANDBOX/LIVE offers are persisted via the store's set()", async () => {
    vi.resetModules();
    process.env.NITZI_OPERATING_MODE = "live";
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [
        {
          slug: "live-store-dest",
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
        },
      ],
    }));
    const setSpy = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/offers/offer-store.server", () => ({
      postgresOfferStore: { get: vi.fn(), set: setSpy },
    }));
    vi.doMock("@/lib/providers/registry", () => ({
      getProviders: () => ({
        packages: {
          id: "mock-live",
          search: async () => [
            {
              id: "pkg-live-1",
              title: "t",
              hotel: {
                id: "h1",
                name: "Hotel",
                stars: 4,
                guestRating: 8,
                reviewsCount: 5,
                pricePerNight: 400,
                currency: "ILS",
                location: "x",
                amenities: [],
                source: "mock-live",
              },
              flight: {
                id: "f1",
                airline: "Air",
                flightNumber: "A1",
                origin: "TLV",
                destination: "X",
                departAt: "2026-09-01T08:00:00.000Z",
                arriveAt: "2026-09-01T10:00:00.000Z",
                durationMinutes: 120,
                stops: 0,
                price: 500,
                currency: "ILS",
                source: "mock-live",
              },
              nights: 3,
              totalPrice: 3000,
              separatePrice: 3200,
              savings: 200,
              includes: [],
              rating: 8,
              source: "mock-live",
            },
          ],
        },
      }),
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    expect(result.sourceMode).toBe("live");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(setSpy).toHaveBeenCalled();
    const callArg = setSpy.mock.calls[0][0];
    expect(callArg.offer.sourceMode).toBe("live");

    delete process.env.NITZI_OPERATING_MODE;
    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/offers/offer-store.server");
    vi.doUnmock("@/lib/providers/registry");
  });

  it("a persistence failure does not produce a fake successful state — offers are still returned honestly, error is not swallowed silently", async () => {
    vi.resetModules();
    process.env.NITZI_OPERATING_MODE = "live";
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [
        {
          slug: "live-fail-dest",
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
        },
      ],
    }));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("@/lib/offers/offer-store.server", () => ({
      postgresOfferStore: {
        get: vi.fn(),
        set: vi.fn().mockRejectedValue(new Error("db unreachable")),
      },
    }));
    vi.doMock("@/lib/providers/registry", () => ({
      getProviders: () => ({
        packages: {
          id: "mock-live",
          search: async () => [
            {
              id: "pkg-fail-1",
              title: "t",
              hotel: {
                id: "h1",
                name: "Hotel",
                stars: 3,
                guestRating: 7,
                reviewsCount: 5,
                pricePerNight: 300,
                currency: "ILS",
                location: "x",
                amenities: [],
                source: "mock-live",
              },
              flight: {
                id: "f1",
                airline: "Air",
                flightNumber: "A1",
                origin: "TLV",
                destination: "X",
                departAt: "2026-09-01T08:00:00.000Z",
                arriveAt: "2026-09-01T10:00:00.000Z",
                durationMinutes: 120,
                stops: 0,
                price: 400,
                currency: "ILS",
                source: "mock-live",
              },
              nights: 2,
              totalPrice: 2000,
              separatePrice: 2100,
              savings: 100,
              includes: [],
              rating: 7,
              source: "mock-live",
            },
          ],
        },
      }),
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    // The search itself still succeeds and is reported honestly...
    expect(result.sourceMode).toBe("live");
    expect(result.offers.length).toBeGreaterThan(0);
    // ...but the persistence failure was surfaced (logged), not silently
    // swallowed into an unqualified "everything is fine" state.
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    delete process.env.NITZI_OPERATING_MODE;
    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/offers/offer-store.server");
    vi.doUnmock("@/lib/providers/registry");
  });
});
