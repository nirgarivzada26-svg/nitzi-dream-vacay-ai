import { describe, expect, it, vi } from "vitest";
import { rowToDestination, type DestinationRow } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { normalizeDemoDeal } from "@/lib/offers/normalize-demo";
import { buildDealRails } from "@/lib/deal-categories";

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
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
    hotels: [
      { name: "מלון א׳", note: "מרכזי" },
      { name: "מלון ב׳", note: "על החוף" },
    ],
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
    ...over,
  };
}

function fullOffer(id: string, sourceMode: string, overrides: Record<string, unknown> = {}) {
  return {
    canonicalId: id,
    sourceMode,
    providerId: "mock",
    providerOfferId: "mock-pkg-strong",
    verifiedAt: "2026-08-11T12:00:00.000Z",
    availabilityState: "available",
    destination: {
      slug: "santorini",
      city: "יעד",
      country: "מדינה",
      region: "אירופה",
      coords: null,
    },
    dates: { start: "2026-09-21T08:00:00.000Z", end: "2026-09-26T08:00:00.000Z", nights: 5 },
    hotel: {
      providerHotelId: "mock-hotel-strong",
      name: "Strong Hotel",
      stars: 5,
      guestRating: 9.4,
      roomRateRef: null,
      board: "unknown",
      cancellationPolicy: { kind: "unknown" },
      refundable: false,
      priceComponent: null,
    },
    flight: null,
    pricing: {
      pricePerPerson: 2500,
      totalPrice: 2500,
      currency: "ILS",
      taxesFees: null,
      extrasAvailable: false,
      verified: true,
      discountPct: null,
    },
    inclusions: [],
    tags: [],
    nitziScore: null,
    smartPrice: null,
    ...overrides,
  };
}

function defaultResolution(id: string) {
  return {
    status: "available",
    canonicalId: id,
    sourceMode: "live",
    previousPrice: null,
    currentPrice: 2500,
    priceDifference: null,
    priceBreakdown: null,
    verifiedAt: "2026-08-11T12:00:00.000Z",
    expiresAt: null,
    reasonCode: null,
    refreshedOffer: fullOffer(id, "live"),
  };
}

async function loadMustNotMiss(mocks: {
  mode?: "demo" | "sandbox" | "live";
  destinations?: DestinationRow[];
  packagesSearch?: (...args: unknown[]) => unknown;
  resolveOfferImpl?: (id: string) => unknown;
  listDealsSpy?: ReturnType<typeof vi.fn>;
  getDealSpy?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();
  if (mocks.mode) process.env.NITZI_OPERATING_MODE = mocks.mode;
  else delete process.env.NITZI_OPERATING_MODE;

  vi.doMock("@/lib/catalog.server", () => ({
    fetchDestinationRows: async () => mocks.destinations ?? [row({ slug: "santorini" })],
  }));
  if (mocks.listDealsSpy || mocks.getDealSpy) {
    vi.doMock("@/lib/deals", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/deals")>();
      return {
        ...actual,
        listDeals: mocks.listDealsSpy ?? actual.listDeals,
        getDeal: mocks.getDealSpy ?? actual.getDeal,
      };
    });
  }
  vi.doMock("@/lib/offers/offer-store.server", () => ({
    postgresOfferStore: { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) },
    getRawOfferRow: vi.fn(),
  }));
  vi.doMock("@/lib/providers/registry", () => ({
    getProviders: () => ({
      packages: {
        id: "mock",
        search:
          mocks.packagesSearch ??
          (async () => [
            {
              id: "mock-pkg-strong",
              title: "t",
              hotel: {
                id: "mock-hotel-strong",
                name: "Strong Hotel",
                stars: 5,
                guestRating: 9.4,
                reviewsCount: 500,
                pricePerNight: 500,
                currency: "ILS",
                location: "x",
                amenities: [],
                source: "mock",
              },
              flight: {
                id: "mock-flight-strong",
                airline: "Air",
                flightNumber: "A1",
                origin: "TLV",
                destination: "x",
                departAt: "2026-09-21T08:00:00.000Z",
                arriveAt: "2026-09-21T10:00:00.000Z",
                durationMinutes: 120,
                stops: 0,
                price: 500,
                currency: "ILS",
                source: "mock",
              },
              nights: 5,
              totalPrice: 5000,
              separatePrice: 6000,
              savings: 1000,
              includes: [],
              rating: 9.4,
              source: "mock",
            },
          ]),
      },
    }),
  }));
  vi.doMock("@/lib/offers/resolve-offer.server", () => ({
    resolveOffer:
      mocks.resolveOfferImpl ?? ((id: string) => Promise.resolve(defaultResolution(id))),
  }));

  return import("@/lib/must-not-miss.functions");
}

type MNMResult = {
  deal: { offer: Record<string, unknown>; priceChanged: boolean } | null;
  sourceMode: string;
  emptyReason: string | null;
};

function asHandler(mod: Awaited<ReturnType<typeof loadMustNotMiss>>) {
  return mod.computeMustNotMissDeal as unknown as () => Promise<MNMResult>;
}

describe("Must-Not-Miss — mode routing", () => {
  it("DEMO selects from demo-normalized CanonicalOffers", async () => {
    const mod = await loadMustNotMiss({ mode: "demo" });
    const result = await asHandler(mod)();
    expect(result.sourceMode).toBe("demo");
  });

  it("LIVE never calls listDeals()/getDeal() as fallback", async () => {
    const listDealsSpy = vi.fn();
    const getDealSpy = vi.fn();
    const mod = await loadMustNotMiss({ mode: "live", listDealsSpy, getDealSpy });
    await asHandler(mod)();
    expect(listDealsSpy).not.toHaveBeenCalled();
    expect(getDealSpy).not.toHaveBeenCalled();
  });

  it("LIVE selects only LIVE CanonicalOffers, never falls back to demo", async () => {
    const mod = await loadMustNotMiss({ mode: "live" });
    const result = await asHandler(mod)();
    expect(result.sourceMode).toBe("live");
    if (result.deal) expect(result.deal.offer.sourceMode).toBe("live");
  });

  it("SANDBOX selects only SANDBOX CanonicalOffers", async () => {
    const mod = await loadMustNotMiss({
      mode: "sandbox",
      resolveOfferImpl: (id: string) =>
        Promise.resolve({
          ...defaultResolution(id),
          sourceMode: "sandbox",
          refreshedOffer: fullOffer(id, "sandbox"),
        }),
    });
    const result = await asHandler(mod)();
    expect(result.sourceMode).toBe("sandbox");
    if (result.deal) expect(result.deal.offer.sourceMode).toBe("sandbox");
  });
});

describe("Must-Not-Miss — LIVE revalidation and honest empty state", () => {
  it("tries the next rotation candidate when the top pick fails revalidation, never showing a stale/sold-out offer", async () => {
    const calls: string[] = [];
    const mod = await loadMustNotMiss({
      mode: "live",
      packagesSearch: () =>
        Promise.resolve([
          {
            id: "mock-pkg-a",
            title: "t",
            hotel: {
              id: "hotel-a",
              name: "Hotel A",
              stars: 5,
              guestRating: 9.5,
              reviewsCount: 10,
              pricePerNight: 400,
              currency: "ILS",
              location: "x",
              amenities: [],
              source: "mock",
            },
            flight: {
              id: "flight-a",
              airline: "Air",
              flightNumber: "A1",
              origin: "TLV",
              destination: "x",
              departAt: "2026-09-21T08:00:00.000Z",
              arriveAt: "2026-09-21T10:00:00.000Z",
              durationMinutes: 120,
              stops: 0,
              price: 500,
              currency: "ILS",
              source: "mock",
            },
            nights: 5,
            totalPrice: 5000,
            separatePrice: 6000,
            savings: 1000,
            includes: [],
            rating: 9.5,
            source: "mock",
          },
          {
            id: "mock-pkg-b",
            title: "t",
            hotel: {
              id: "hotel-b",
              name: "Hotel B",
              stars: 5,
              guestRating: 9.3,
              reviewsCount: 10,
              pricePerNight: 400,
              currency: "ILS",
              location: "x",
              amenities: [],
              source: "mock",
            },
            flight: {
              id: "flight-b",
              airline: "Air",
              flightNumber: "A2",
              origin: "TLV",
              destination: "x",
              departAt: "2026-09-21T08:00:00.000Z",
              arriveAt: "2026-09-21T10:00:00.000Z",
              durationMinutes: 120,
              stops: 0,
              price: 500,
              currency: "ILS",
              source: "mock",
            },
            nights: 5,
            totalPrice: 5000,
            separatePrice: 6000,
            savings: 1000,
            includes: [],
            rating: 9.3,
            source: "mock",
          },
        ]),
      // Whichever candidate is tried FIRST (rotation order depends on
      // today's real day-bucket, not fixed by this test) fails as
      // sold-out; the other one succeeds. The invariant under test is the
      // OUTCOME — the sold-out one is never shown — not the specific call
      // order, which legitimately varies by day.
      resolveOfferImpl: (id: string) => {
        calls.push(id);
        if (calls.length === 1) {
          return Promise.resolve({
            status: "sold_out",
            canonicalId: id,
            sourceMode: "live",
            previousPrice: null,
            currentPrice: null,
            priceDifference: null,
            priceBreakdown: null,
            verifiedAt: null,
            expiresAt: null,
            reasonCode: "hotel_sold_out",
            refreshedOffer: null,
          });
        }
        return Promise.resolve({
          ...defaultResolution(id),
          refreshedOffer: fullOffer(id, "live", {
            hotel: { ...fullOffer(id, "live").hotel, name: "Second Candidate Hotel" },
          }),
        });
      },
    });
    const result = await asHandler(mod)();
    expect(result.deal).not.toBeNull();
    // The offer shown is never the one that resolved sold-out.
    expect(result.deal!.offer.hotel).toMatchObject({ name: "Second Candidate Hotel" });
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it("no eligible LIVE offer produces an honest empty state, not a DEMO fallback", async () => {
    const mod = await loadMustNotMiss({ mode: "live", packagesSearch: () => Promise.resolve([]) });
    const result = await asHandler(mod)();
    expect(result.deal).toBeNull();
    expect(result.sourceMode).toBe("live");
    expect(result.emptyReason).not.toBeNull();
  });

  it("price-changed offer uses the current (freshly revalidated) price, not stale price", async () => {
    const mod = await loadMustNotMiss({
      mode: "live",
      resolveOfferImpl: (id: string) =>
        Promise.resolve({
          status: "price_changed",
          canonicalId: id,
          sourceMode: "live",
          previousPrice: 2000,
          currentPrice: 2800,
          priceDifference: 800,
          priceBreakdown: null,
          verifiedAt: "2026-08-11T12:00:00.000Z",
          expiresAt: null,
          reasonCode: null,
          refreshedOffer: fullOffer(id, "live", {
            pricing: { ...fullOffer(id, "live").pricing, pricePerPerson: 2800 },
          }),
        }),
    });
    const result = await asHandler(mod)();
    expect((result.deal!.offer.pricing as { pricePerPerson: number }).pricePerPerson).toBe(2800);
    expect(result.deal!.priceChanged).toBe(true);
  });
});

describe("Must-Not-Miss — canonical identity preserved", () => {
  it("the deal's canonicalId/providerId/providerOfferId are real and usable for /deal/:id navigation", async () => {
    const mod = await loadMustNotMiss({ mode: "live" });
    const result = await asHandler(mod)();
    expect(result.deal!.offer.canonicalId as string).toMatch(/^live:/);
    expect(result.deal!.offer.providerId).toBeTruthy();
    expect(result.deal!.offer.providerOfferId).toBeTruthy();
  });
});

describe("Must-Not-Miss — dedup with homepage rails", () => {
  it("buildDealRails accepts an array of excluded slugs (Secret Deal + Must-Not-Miss) and excludes both from the first rail", () => {
    const catalog = Array.from({ length: 10 }, (_, i) =>
      rowToDestination(row({ slug: `dest-${i}`, name: `יעד ${i}` })),
    );
    const rails = buildDealRails(catalog, { excludeFromFirstRail: ["dest-0", "dest-1"] });
    if (rails.length > 0) {
      const firstRailKeys = rails[0].groups.map((g) => g.key);
      expect(firstRailKeys).not.toContain("dest-0");
      expect(firstRailKeys).not.toContain("dest-1");
    }
  });

  it("a single string still works for backward compatibility", () => {
    const catalog = Array.from({ length: 10 }, (_, i) =>
      rowToDestination(row({ slug: `dest-${i}`, name: `יעד ${i}` })),
    );
    const rails = buildDealRails(catalog, { excludeFromFirstRail: "dest-0" });
    if (rails.length > 0) {
      expect(rails[0].groups.map((g) => g.key)).not.toContain("dest-0");
    }
  });
});

describe("Must-Not-Miss — DEMO sanity check against the real listDeals/normalizeDemoDeal pipeline", () => {
  it("real demo deals normalize into eligible CanonicalOffers", () => {
    const catalog = [rowToDestination(row({ slug: "santorini" }))];
    const deals = listDeals(catalog, 3);
    const offers = deals.map(normalizeDemoDeal);
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) {
      expect(o.canonicalId).toMatch(/^demo:nitzi-demo:/);
    }
  });
});
