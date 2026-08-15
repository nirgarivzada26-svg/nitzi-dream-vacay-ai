import { describe, expect, it, vi } from "vitest";
import type { CanonicalOffer } from "@/lib/offers/canonical-offer";

function makeOffer(overrides: Record<string, unknown> = {}): CanonicalOffer {
  return {
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    providerId: "acme",
    providerOfferId: "offer-1",
    verifiedAt: "2026-08-11T10:00:00.000Z",
    availabilityState: "available",
    destination: {
      slug: "santorini",
      city: "סנטוריני",
      country: "יוון",
      region: "אירופה",
      coords: null,
    },
    dates: { start: "2026-09-01T08:00:00.000Z", end: "2026-09-06T08:00:00.000Z", nights: 5 },
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
  } as CanonicalOffer;
}

function resolution(overrides: Record<string, unknown> = {}) {
  return {
    status: "available",
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    previousPrice: null,
    currentPrice: 4000,
    priceDifference: null,
    priceBreakdown: null,
    verifiedAt: "2026-08-11T12:00:00.000Z",
    expiresAt: null,
    reasonCode: null,
    refreshedOffer: makeOffer(),
    ...overrides,
  };
}

async function loadCompareTrips(mocks: {
  mode?: "demo" | "sandbox" | "live";
  resolveOfferImpl?: (id: string) => unknown;
  getDealSpy?: ReturnType<typeof vi.fn>;
  listDealsSpy?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();
  if (mocks.mode) process.env.NITZI_OPERATING_MODE = mocks.mode;
  else delete process.env.NITZI_OPERATING_MODE;

  vi.doMock("@/lib/catalog.server", () => ({
    fetchDestinationRows: async () => [
      {
        slug: "santorini",
        name: "סנטוריני",
        country: "יוון",
        country_code: "GR",
        flag: "🇬🇷",
        region: "אירופה",
        tagline: "",
        weather: "",
        flight_hours: 3,
        avg_budget_per_person: 4000,
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

  if (mocks.getDealSpy || mocks.listDealsSpy) {
    vi.doMock("@/lib/deals", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/deals")>();
      return {
        ...actual,
        getDeal: mocks.getDealSpy ?? actual.getDeal,
        listDeals: mocks.listDealsSpy ?? actual.listDeals,
      };
    });
  }

  const defaultResolve = (id: string) =>
    Promise.resolve(
      resolution({ canonicalId: id, refreshedOffer: makeOffer({ canonicalId: id }) }),
    );
  vi.doMock("@/lib/offers/resolve-offer.server", () => ({
    resolveOffer: mocks.resolveOfferImpl ?? defaultResolve,
  }));

  return import("@/lib/agent/agent-search.server");
}

describe("compareTrips — DEMO unchanged", () => {
  it("still works and legacy demo ids still work", async () => {
    const mod = await loadCompareTrips({ mode: "demo" });
    const catalog = await mod.getCatalog();
    const deals = mod === undefined ? [] : (await import("@/lib/deals")).listDeals(catalog, 3);
    const ids = deals.slice(0, 2).map((d) => d.id);
    const result = await mod.compareTrips(ids);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.note).toBeNull();
  });

  it("an empty/unknown id list returns the same empty shape as before, now including note: null", async () => {
    const mod = await loadCompareTrips({ mode: "demo" });
    const result = await mod.compareTrips(["not-a-real-slug"]);
    expect(result.items).toEqual([]);
    expect(result.note).toBeNull();
  });
});

describe("compareTrips — LIVE/SANDBOX never falls back to demo, never calls getDeal/listDeals", () => {
  it("LIVE compareTrips never calls getDeal()", async () => {
    const getDealSpy = vi.fn();
    const mod = await loadCompareTrips({ mode: "live", getDealSpy });
    await mod.compareTrips(["live:acme:offer-1"]);
    expect(getDealSpy).not.toHaveBeenCalled();
  });

  it("LIVE compareTrips never calls listDeals()", async () => {
    const listDealsSpy = vi.fn();
    const mod = await loadCompareTrips({ mode: "live", listDealsSpy });
    await mod.compareTrips(["live:acme:offer-1"]);
    expect(listDealsSpy).not.toHaveBeenCalled();
  });

  it("SANDBOX behaves like SANDBOX, not DEMO — offers carry sourceMode 'sandbox'", async () => {
    const mod = await loadCompareTrips({
      mode: "sandbox",
      resolveOfferImpl: (id) =>
        Promise.resolve(
          resolution({
            canonicalId: id,
            sourceMode: "sandbox",
            refreshedOffer: makeOffer({ canonicalId: id, sourceMode: "sandbox" }),
          }),
        ),
    });
    const result = await mod.compareTrips(["sandbox:acme:offer-1"]);
    expect(result.items[0].dealId).toBe("sandbox:acme:offer-1");
  });
});

describe("compareTrips — canonical identity survives comparison", () => {
  it("canonicalId is used as the navigation/deep-link id, never converted to a demo slug", async () => {
    const mod = await loadCompareTrips({ mode: "live" });
    const result = await mod.compareTrips(["live:acme:offer-1", "live:acme:offer-2"]);
    for (const item of result.items) {
      expect(item.dealId).toMatch(/^live:acme:/);
    }
  });

  it("resolves the SAME logical offer requested — no silent substitution (resolveOffer is called with the exact id, once per id)", async () => {
    const resolveSpy = vi.fn((id: string) =>
      Promise.resolve(
        resolution({ canonicalId: id, refreshedOffer: makeOffer({ canonicalId: id }) }),
      ),
    );
    const mod = await loadCompareTrips({ mode: "live", resolveOfferImpl: resolveSpy });
    await mod.compareTrips(["live:acme:offer-1", "live:acme:offer-2"]);
    expect(resolveSpy).toHaveBeenCalledWith("live:acme:offer-1");
    expect(resolveSpy).toHaveBeenCalledWith("live:acme:offer-2");
    expect(resolveSpy).toHaveBeenCalledTimes(2);
  });
});

describe("compareTrips — price-change and availability handling", () => {
  it("price_changed uses the current (post-revalidation) price, and discloses the change", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: () =>
        Promise.resolve(
          resolution({
            status: "price_changed",
            previousPrice: 4000,
            currentPrice: 4500,
            priceDifference: 500,
            refreshedOffer: makeOffer({
              pricing: { ...makeOffer().pricing, pricePerPerson: 4500 },
            }),
          }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const priceRow = result.rows.find((r) => r.label === "מחיר לאדם");
    expect(priceRow?.values[0]).toMatch(/4,500|4500/);
    const changeRow = result.rows.find((r) => r.label === "שינוי מחיר");
    expect(changeRow).toBeDefined();
  });

  it("sold_out is marked unavailable, never treated as bookable/comparable", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: () =>
        Promise.resolve(
          resolution({ status: "sold_out", currentPrice: null, refreshedOffer: null }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    expect(result.bestValueDealId).toBeNull();
    expect(result.bestHotelDealId).toBeNull();
    expect(result.cheapestDealId).toBeNull();
    const statusRow = result.rows.find((r) => r.label === "סטטוס");
    expect(statusRow?.values[0]).toMatch(/אזל המלאי/);
  });

  it("expired is handled honestly, never silently substituted", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: () =>
        Promise.resolve(
          resolution({ status: "expired", currentPrice: null, refreshedOffer: null }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const statusRow = result.rows.find((r) => r.label === "סטטוס");
    expect(statusRow?.values[0]).toMatch(/פגה/);
    expect(result.items[0].dealId).toBe("live:acme:offer-1"); // still the requested id, not a substitute
  });

  it("provider_unavailable is handled safely, without crashing or exposing a raw error", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: () =>
        Promise.resolve(
          resolution({ status: "provider_unavailable", currentPrice: null, refreshedOffer: null }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const statusRow = result.rows.find((r) => r.label === "סטטוס");
    expect(statusRow?.values[0]).not.toMatch(/error|Error|stack|exception/i);
  });

  it("not_found does not substitute another offer", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: (id: string) =>
        Promise.resolve(
          resolution({
            canonicalId: id,
            status: "not_found",
            currentPrice: null,
            refreshedOffer: null,
          }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:missing-offer"]);
    expect(result.items[0].dealId).toBe("live:acme:missing-offer");
    expect(result.items[0].title).toMatch(/לא נמצאה/);
  });
});

describe("compareTrips — honest unknown-data handling", () => {
  it("unknown cancellation never becomes non-refundable/free", async () => {
    const mod = await loadCompareTrips({ mode: "live" });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const cancelRow = result.rows.find((r) => r.label === "ביטול");
    expect(cancelRow?.values[0]).toMatch(/תאומת לפני ההזמנה/);
    expect(cancelRow?.values[0]).not.toMatch(/ביטול חינם|לא ניתן לביטול/);
  });

  it("unknown board never becomes all-inclusive", async () => {
    const mod = await loadCompareTrips({ mode: "live" });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const boardRow = result.rows.find((r) => r.label === "בסיס אירוח");
    expect(boardRow?.values[0]).toBe("לא ידוע");
  });

  it("missing/unverified flight data never becomes 'direct'", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: () =>
        Promise.resolve(resolution({ refreshedOffer: makeOffer({ flight: null }) })),
    });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const flightRow = result.rows.find((r) => r.label === "טיסה");
    expect(flightRow?.values[0]).toBe("לא ידוע");
    expect(flightRow?.values[0]).not.toMatch(/ישירה/);
  });

  it("null discountPct never creates savings/discount language anywhere in the comparison output", async () => {
    const mod = await loadCompareTrips({ mode: "live" });
    const result = await mod.compareTrips(["live:acme:offer-1"]);
    const allText = result.rows.flatMap((r) => r.values).join(" ");
    expect(allText).not.toMatch(/הנחה|חיסכון/);
  });

  it("missing data on one side does not automatically make the comparable offer 'win' by default — no forced winner with fewer than 2 comparable offers", async () => {
    const mod = await loadCompareTrips({ mode: "live" });
    const result = await mod.compareTrips(["live:acme:offer-1"]); // only 1 offer
    expect(result.bestValueDealId).toBeNull();
    expect(result.note).toMatch(/אין כרגע מספיק מידע מאומת/);
  });
});

describe("compareTrips — no forced winner without sufficient verified data", () => {
  it("with two comparable offers but no real nitziScore on either, bestValueDealId stays honestly null", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: (id: string) =>
        Promise.resolve(
          resolution({
            canonicalId: id,
            refreshedOffer: makeOffer({ canonicalId: id, nitziScore: null }),
          }),
        ),
    });
    const result = await mod.compareTrips(["live:acme:offer-1", "live:acme:offer-2"]);
    expect(result.bestValueDealId).toBeNull();
  });

  it("cheapest/bestHotel winners ARE determined when both sides have real comparable data", async () => {
    const mod = await loadCompareTrips({
      mode: "live",
      resolveOfferImpl: (id: string) => {
        const cheap = id.endsWith("1");
        return Promise.resolve(
          resolution({
            canonicalId: id,
            currentPrice: cheap ? 3000 : 5000,
            refreshedOffer: makeOffer({
              canonicalId: id,
              pricing: { ...makeOffer().pricing, pricePerPerson: cheap ? 3000 : 5000 },
              hotel: { ...makeOffer().hotel, stars: cheap ? 3 : 5, guestRating: cheap ? 6 : 9 },
            }),
          }),
        );
      },
    });
    const result = await mod.compareTrips(["live:acme:offer-1", "live:acme:offer-2"]);
    expect(result.cheapestDealId).toBe("live:acme:offer-1");
    expect(result.bestHotelDealId).toBe("live:acme:offer-2");
  });
});
