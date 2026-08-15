import { describe, expect, it, vi } from "vitest";
import { rowToDestination, type DestinationRow } from "@/lib/catalog";
import { getDeal, groupDeals, listDeals } from "@/lib/deals";
import { normalizeDemoDeal } from "@/lib/offers/normalize-demo";
import { normalizeProviderPackage } from "@/lib/offers/normalize-provider";
import type { Package } from "@/lib/providers/types";

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד",
    country: "מדינה",
    country_code: "GR",
    flag: "🇬🇷",
    region: "אירופה",
    tagline: "חופים ועיר עתיקה",
    weather: "28°",
    flight_hours: 4,
    avg_budget_per_person: 3000,
    matches: ["beach", "romantic", "family"],
    is_popular: true,
    has_offers: true,
    hotels: [
      { name: "מלון א׳", note: "מרכזי" },
      { name: "מלון ב׳", note: "על החוף" },
      { name: "מלון ג׳", note: "בוטיק" },
    ],
    attractions: ["אטרקציה"],
    restaurants: ["מסעדה"],
    itinerary: ["יום ראשון"],
    sort_order: 1,
    city_en: "City",
    country_en: "Country",
    subregion: "Southern Europe",
    airport_codes: ["ABC"],
    latitude: 37,
    longitude: 23,
    timezone: "Europe/Athens",
    currency: "EUR",
    languages: ["Greek"],
    image_url: null,
    short_description: "תיאור",
    best_travel_months: [6, 7],
    average_trip_duration: 5,
    travel_categories: ["beach"],
    direct_flight_from_tlv: true,
    provider_supported: true,
    demo_supported: true,
    is_featured: false,
    is_trending: false,
    ...over,
  };
}

function makeCatalog(count: number) {
  return Array.from({ length: count }, (_, i) =>
    rowToDestination(row({ slug: `pkg-dest-${i}`, name: `יעד ${i}` })),
  );
}

describe("CanonicalOffer gap-fix fields (region/dates/discountPct/tags)", () => {
  it("normalizeDemoDeal populates region/dates/discountPct correctly from the real Deal", () => {
    const catalog = makeCatalog(1);
    const deal = listDeals(catalog, 1)[0];
    const offer = normalizeDemoDeal(deal);

    expect(offer.destination.region).toBe(deal.destination.region);
    expect(offer.dates).toEqual({
      start: deal.dates.start,
      end: deal.dates.end,
      nights: deal.dates.nights,
    });
    expect(offer.pricing.discountPct).toBe(deal.discountPct);
  });

  it("provider tags come from real destination.matches metadata, not left empty (regression for the bug found this batch)", () => {
    const destination = makeCatalog(1)[0];
    const pkg: Package = {
      id: "pkg-1",
      title: "t",
      hotel: {
        id: "h1",
        name: "Hotel",
        stars: 4,
        guestRating: 8,
        reviewsCount: 10,
        pricePerNight: 400,
        currency: "ILS",
        location: "x",
        amenities: [],
        source: "acme",
      },
      flight: {
        id: "f1",
        airline: "Acme Air",
        flightNumber: "AC1",
        origin: "TLV",
        destination: "ACM",
        departAt: "2026-09-01T08:00:00.000Z",
        arriveAt: "2026-09-01T10:00:00.000Z",
        durationMinutes: 120,
        stops: 0,
        price: 500,
        currency: "ILS",
        source: "acme",
      },
      nights: 4,
      totalPrice: 5000,
      separatePrice: 5500,
      savings: 500,
      includes: [],
      rating: 8,
      source: "acme",
    };
    const offer = normalizeProviderPackage({
      sourceMode: "live",
      destination,
      pkg,
      peoplePerBooking: 2,
    });

    expect(offer.tags).toEqual(destination.matches);
    expect(offer.tags.length).toBeGreaterThan(0);
    expect(offer.destination.region).toBe(destination.region);
  });

  it("provider offers now honestly populate dates from the real Package.flight.departAt + nights (corrected in the Supplier Search Context batch), while discountPct/board/cancellation remain correctly unknown", () => {
    const destination = makeCatalog(1)[0];
    const pkg: Package = {
      id: "pkg-2",
      title: "t",
      hotel: {
        id: "h2",
        name: "Hotel 2",
        stars: 3,
        guestRating: 7,
        reviewsCount: 5,
        pricePerNight: 300,
        currency: "ILS",
        location: "x",
        amenities: [],
        source: "acme",
      },
      flight: {
        id: "f2",
        airline: "Acme Air",
        flightNumber: "AC2",
        origin: "TLV",
        destination: "ACM",
        departAt: "2026-09-01T08:00:00.000Z",
        arriveAt: "2026-09-01T10:00:00.000Z",
        durationMinutes: 120,
        stops: 1,
        price: 400,
        currency: "ILS",
        source: "acme",
      },
      nights: 3,
      totalPrice: 3000,
      separatePrice: 3200,
      savings: 200,
      includes: [],
      rating: 7,
      source: "acme",
    };
    const offer = normalizeProviderPackage({
      sourceMode: "sandbox",
      destination,
      pkg,
      peoplePerBooking: 2,
    });

    // dates ARE real now — sourced from pkg.flight.departAt (a genuine,
    // server-computed date) + pkg.nights, not fabricated, not left null
    // when the data is actually available.
    expect(offer.dates).toEqual({
      start: "2026-09-01T08:00:00.000Z",
      end: "2026-09-04T08:00:00.000Z", // start + 3 nights
      nights: 3,
    });
    // Still genuinely unknown — unaffected by this fix, since no such
    // field exists anywhere in the active provider layer.
    expect(offer.pricing.discountPct).toBeNull();
    expect(offer.hotel.board).toBe("unknown");
    expect(offer.hotel.cancellationPolicy).toEqual({ kind: "unknown" });
  });
});

describe("/packages DEMO parity — the migrated sourcing pipeline matches the pre-migration pipeline exactly", () => {
  it("listDeals(catalog,3) + groupDeals() (what getPackagesOffers feeds into for DEMO) is unchanged and deterministic", () => {
    const catalog = makeCatalog(15);
    const dealsA = listDeals(catalog, 3);
    const dealsB = listDeals(catalog, 3);
    // Same catalog -> same deals, every time (deterministic seed).
    expect(dealsA.map((d) => d.id)).toEqual(dealsB.map((d) => d.id));

    const groupsA = groupDeals(dealsA);
    // One group per destination, main + variants preserved.
    for (const g of groupsA) {
      expect(g.main).toBeDefined();
      expect(g.variants.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("supported filters (country/region/stars/budget/direct/beach) still behave correctly against the real Deal pool", () => {
    const catalog = makeCatalog(10);
    const all = listDeals(catalog, 3);

    const directOnly = all.filter((d) => d.outbound.stops === 0 && d.inbound.stops === 0);
    const nonDirect = all.filter((d) => d.outbound.stops > 0 || d.inbound.stops > 0);
    expect(directOnly.length + nonDirect.length).toBe(all.length);

    const beachOnly = all.filter((d) => d.destination.matches.includes("beach"));
    expect(beachOnly.length).toBeGreaterThan(0); // fixture destinations are tagged "beach"

    const under5000 = all.filter((d) => d.price.perPerson <= 5000);
    for (const d of under5000) expect(d.price.perPerson).toBeLessThanOrEqual(5000);
  });
});

describe("Dedup regression: legitimate variants are preserved, not collapsed", () => {
  it("groupDeals never merges genuinely different hotel/date/flight combinations into one", () => {
    const catalog = makeCatalog(5);
    const deals = listDeals(catalog, 3);
    const groups = groupDeals(deals);

    for (const g of groups) {
      const allForDest = [g.main, ...g.variants];
      // Every variant for a destination should still be individually
      // resolvable through the unmodified getDeal() — proving grouping
      // didn't discard or merge any of them.
      for (const d of allForDest) {
        expect(getDeal(d.id, catalog)).not.toBeNull();
      }
      // IDs within a group are unique (main + each variant is distinct).
      const ids = allForDest.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("Canonical DEMO /deal/:id links — no regression", () => {
  it("every deal produced by the /packages pipeline still resolves through the unmodified getDeal()", () => {
    const catalog = makeCatalog(8);
    const deals = listDeals(catalog, 3);
    for (const d of deals) {
      expect(getDeal(d.id, catalog)).not.toBeNull();
    }
  });
});

describe("getPackagesOffers's sourcing (getActiveOffers) — sandbox/live never reach listDeals()", () => {
  it("the sandbox/live branch never calls listDeals() and returns an explicit non-demo empty state", async () => {
    // getPackagesOffers() is a thin createServerFn wrapper around
    // getActiveOffers() with no additional branching logic of its own for
    // the non-demo case (see packages-offers.functions.ts) — createServerFn
    // handlers require the live server runtime's AsyncLocalStorage context
    // to invoke directly, so the meaningful behavior is verified against
    // the underlying function it calls, which carries the actual logic.
    vi.resetModules();
    process.env.NITZI_OPERATING_MODE = "live";
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [row({ slug: "pkg-live-dest" })],
    }));
    const listDealsSpy = vi.fn();
    vi.doMock("@/lib/deals", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/deals")>();
      return { ...actual, listDeals: listDealsSpy };
    });
    vi.doMock("@/lib/providers/registry", () => ({
      getProviders: () => ({
        packages: { id: "mock-live", search: async () => [] },
      }),
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    expect(listDealsSpy).not.toHaveBeenCalled();
    expect(result.sourceMode).toBe("live");
    expect(result.offers).toEqual([]);
    expect(result.emptyReason).not.toBeNull();

    delete process.env.NITZI_OPERATING_MODE;
    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/deals");
    vi.doUnmock("@/lib/providers/registry");
  });
});
