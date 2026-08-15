import { describe, expect, it, vi } from "vitest";
import type { DestinationRow } from "@/lib/catalog";
import type { AgentFilters } from "@/lib/agent/agent-types";

const NO_FILTERS: AgentFilters = {
  destinations: null,
  countries: null,
  tripType: null,
  style: null,
  maxBudgetPerPerson: null,
  nights: null,
  people: null,
  minStars: null,
  board: null,
  directOnly: null,
  musts: null,
  exclude: null,
  requestedDates: null,
  dateFlexibility: null,
  childrenAges: null,
  baggagePreference: null,
};

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד בדיקה",
    country: "מדינת בדיקה",
    country_code: "XX",
    flag: "🏳️",
    region: "אירופה",
    tagline: "",
    weather: "",
    flight_hours: 3,
    avg_budget_per_person: 4000,
    matches: ["beach", "family"],
    is_popular: true,
    has_offers: true,
    hotels: [{ name: "מלון בדיקה", note: "" }],
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

function samplePackage(overrides: Record<string, unknown> = {}) {
  return {
    id: "mock-pkg-0-Santorini",
    title: "t",
    hotel: {
      id: "mock-hotel-0-Santorini",
      name: "Grand Santorini Suites",
      stars: 4,
      guestRating: 8.5,
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

async function loadAgentSearch(mocks: {
  mode?: "demo" | "sandbox" | "live";
  destinations?: DestinationRow[];
  packagesSearch?: (...args: unknown[]) => unknown;
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
  vi.doMock("@/lib/providers/registry", () => ({
    getProviders: () => ({
      packages: { id: "mock", search: mocks.packagesSearch ?? (async () => [samplePackage()]) },
      hotels: { id: "mock", search: async () => [] },
      flights: { id: "mock", search: async () => [] },
    }),
  }));

  return import("@/lib/agent/agent-search.server");
}

describe("searchTrips — DEMO mode unchanged", () => {
  it("still returns recommendations sourced from the demo catalog", async () => {
    const mod = await loadAgentSearch({ mode: "demo" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].sourceMode).toBe("demo");
  });

  it("demo recommendations carry a demo canonical id, never listDeals-bypassing behavior", async () => {
    const mod = await loadAgentSearch({ mode: "demo" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations[0].canonicalId).toMatch(/^demo:nitzi-demo:/);
    expect(result.recommendations[0].providerId).toBe("nitzi-demo");
  });
});

describe("searchTrips — SANDBOX/LIVE sources exclusively through getActiveOffers()", () => {
  it("LIVE mode never calls listDeals()", async () => {
    const listDealsSpy = vi.fn();
    const mod = await loadAgentSearch({ mode: "live", listDealsSpy });
    await mod.searchTrips({ ...NO_FILTERS });
    expect(listDealsSpy).not.toHaveBeenCalled();
  });

  it("LIVE mode never calls getDeal()", async () => {
    const getDealSpy = vi.fn();
    const mod = await loadAgentSearch({ mode: "live", getDealSpy });
    await mod.searchTrips({ ...NO_FILTERS });
    expect(getDealSpy).not.toHaveBeenCalled();
  });

  it("SANDBOX mode never falls back to demo — a real provider result is used exclusively", async () => {
    const mod = await loadAgentSearch({ mode: "sandbox" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations.every((r) => r.sourceMode === "sandbox")).toBe(true);
  });

  it("LIVE mode never falls back to demo", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations.every((r) => r.sourceMode === "live")).toBe(true);
  });

  it("zero LIVE results returns an honest empty state, not demo destinations", async () => {
    const mod = await loadAgentSearch({ mode: "live", packagesSearch: async () => [] });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations).toEqual([]);
    expect(result.emptyReason).not.toBeNull();
  });

  it("a provider search failure does not expose a raw error", async () => {
    const mod = await loadAgentSearch({
      mode: "live",
      packagesSearch: async () => {
        throw new Error("raw internal provider stack trace: connection refused at 10.0.0.5:443");
      },
    });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.emptyReason).not.toMatch(/10\.0\.0\.5|stack trace|connection refused/);
  });
});

describe("searchTrips — LIVE availability filtering", () => {
  it("never includes an offer whose availabilityState is 'unavailable'", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations.every((r) => r.availabilityState !== "unavailable")).toBe(true);
  });
});

describe("searchTrips — canonical identity preserved into the recommendation", () => {
  it("canonicalId, providerId, providerOfferId, sourceMode, currency are all preserved from the real offer", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    expect(rec.canonicalId).toMatch(/^live:mock:/);
    expect(rec.providerId).toBe("mock");
    expect(rec.providerOfferId).toBe("mock-pkg-0-Santorini");
    expect(rec.sourceMode).toBe("live");
    expect(rec.currency).toBe("ILS");
  });

  it("the recommendation deep link (dealId) uses the full canonicalId for LIVE offers", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations[0].dealId).toBe(result.recommendations[0].canonicalId);
  });
});

describe("searchTrips — unknown-data honesty (never manufactured)", () => {
  it("a LIVE offer's unverified price is never described as verified — the note discloses it", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    expect(rec.note).toMatch(/טרם אומת/);
  });

  it("unknown cancellation is never described as free", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    expect(rec.cancellationPolicy.kind).toBe("unknown");
    expect(rec.freeCancellation).toBe(false);
    expect((rec.advantage ?? "") + (rec.compromise ?? "")).not.toMatch(/ביטול חינם/);
  });

  it("unknown board is never described as all-inclusive", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    expect(rec.board).toBe("unknown");
    expect(rec.reasons.join(" ")).not.toMatch(/הכל כלול/);
  });

  it("null discountPct never creates discount language", async () => {
    const mod = await loadAgentSearch({ mode: "live" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    expect(rec.reasons.join(" ")).not.toMatch(/הנחה של/);
    expect(rec.advantage ?? "").not.toMatch(/הנחה של/);
  });
});

describe("searchTrips — ranking, alternatives, and empty-state diagnosis still work for LIVE offers", () => {
  it("ranking still works with multiple valid offers", async () => {
    const mod = await loadAgentSearch({
      mode: "live",
      packagesSearch: async () => [
        samplePackage({
          id: "pkg-a",
          hotel: { ...samplePackage().hotel, id: "hotel-a", guestRating: 6, stars: 3 },
        }),
        samplePackage({
          id: "pkg-b",
          hotel: { ...samplePackage().hotel, id: "hotel-b", guestRating: 9.5, stars: 5 },
        }),
      ],
    });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    expect(result.recommendations.length).toBe(2);
    const [first, second] = result.recommendations;
    expect(first.nitziScore).toBeGreaterThanOrEqual(second.nitziScore);
  });

  it("cheaper/better alternatives stay scoped to the same LIVE result set", async () => {
    const mod = await loadAgentSearch({
      mode: "live",
      packagesSearch: async () => [
        samplePackage({ id: "pkg-cheap", totalPrice: 2000 }),
        samplePackage({
          id: "pkg-mid",
          hotel: { ...samplePackage().hotel, id: "hotel-mid", stars: 4, guestRating: 8 },
          totalPrice: 5000,
        }),
      ],
    });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const canonicalIds = new Set(result.recommendations.map((r) => r.canonicalId));
    for (const rec of result.recommendations) {
      if (rec.cheaperAlternativeDealId)
        expect(canonicalIds.has(rec.cheaperAlternativeDealId)).toBe(true);
      if (rec.betterAlternativeDealId)
        expect(canonicalIds.has(rec.betterAlternativeDealId)).toBe(true);
    }
  });

  it("zero-result LIVE search still returns a real, honest emptyReason (demo's relaxation-probe diagnosis is not falsely claimed for live)", async () => {
    const mod = await loadAgentSearch({ mode: "live", packagesSearch: async () => [] });
    const result = await mod.searchTrips({ ...NO_FILTERS, directOnly: true });
    expect(result.blockingConstraint).toBeNull();
    expect(result.emptyReason).not.toBeNull();
  });
});

describe("existing DEMO AI behavior remains fully compatible", () => {
  it("demo searchTrips output shape is unchanged (all previously-existing fields still present)", async () => {
    const mod = await loadAgentSearch({ mode: "demo" });
    const result = await mod.searchTrips({ ...NO_FILTERS });
    const rec = result.recommendations[0];
    for (const key of [
      "dealId",
      "kind",
      "destination",
      "hotelName",
      "pricePerPerson",
      "outbound",
      "advantage",
      "compromise",
      "cheaperAlternativeDealId",
      "betterAlternativeDealId",
    ]) {
      expect(rec).toHaveProperty(key);
    }
  });
});
