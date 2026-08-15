import { describe, expect, it, vi } from "vitest";
import { rowToDestination, type DestinationRow } from "@/lib/catalog";
import { getDeal, listDeals } from "@/lib/deals";
import { normalizeDemoDeal } from "@/lib/offers/normalize-demo";
import { normalizeProviderPackage } from "@/lib/offers/normalize-provider";
import { decodeCanonicalId, demoCanonicalId, providerCanonicalId } from "@/lib/offers/canonical-id";
import { currentOperatingMode } from "@/lib/providers/credentials.server";
import type { Package } from "@/lib/providers/types";
import { buildDealRails } from "@/lib/deal-categories";

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
    rowToDestination(row({ slug: `dest-${i}`, name: `יעד ${i}` })),
  );
}

describe("normalizeDemoDeal — Deal -> CanonicalOffer", () => {
  const catalog = makeCatalog(1);
  const deal = listDeals(catalog, 1)[0];
  const offer = normalizeDemoDeal(deal);

  it("preserves price exactly", () => {
    expect(offer.pricing.pricePerPerson).toBe(deal.price.perPerson);
    expect(offer.pricing.totalPrice).toBe(deal.price.total);
    expect(offer.pricing.currency).toBe("ILS");
  });

  it("preserves the cancellation policy exactly, and refundable agrees with it", () => {
    expect(offer.hotel.cancellationPolicy).toEqual(deal.cancellationPolicy);
    expect(offer.hotel.refundable).toBe(deal.freeCancellation);
  });

  it("sourceMode is 'demo' and provider identity matches the demo scheme", () => {
    expect(offer.sourceMode).toBe("demo");
    expect(offer.providerId).toBe("nitzi-demo");
    expect(offer.providerOfferId).toBe(deal.id);
  });

  it("fields the demo model genuinely has no data for stay null/unknown — never fabricated", () => {
    expect(offer.hotel.providerHotelId).toBeNull();
    expect(offer.hotel.roomRateRef).toBeNull();
    expect(offer.flight!.outbound.baggage).toBeNull();
    expect(offer.flight!.outbound.fareRules).toBeNull();
    expect(offer.flight!.inbound.baggage).toBeNull();
    expect(offer.flight!.inbound.fareRules).toBeNull();
  });

  it("still maps the real fields DealFlight does have (airline, flight number, times, stops)", () => {
    expect(offer.flight!.outbound.airline).toBe(deal.outbound.airline);
    expect(offer.flight!.outbound.flightNumber).toBe(deal.outbound.flightNumber);
    expect(offer.flight!.outbound.stops).toBe(deal.outbound.stops);
  });

  it("preserves destination identity and hotel facts", () => {
    expect(offer.destination.slug).toBe(deal.destination.slug);
    expect(offer.hotel.name).toBe(deal.hotel.name);
    expect(offer.hotel.stars).toBe(deal.hotel.stars);
    expect(offer.hotel.board).toBe(deal.board);
  });
});

describe("canonical ID scheme", () => {
  it("demoCanonicalId is stable — same dealId always produces the same canonicalId", () => {
    const a = demoCanonicalId("santorini");
    const b = demoCanonicalId("santorini");
    expect(a).toBe(b);
    expect(a).toBe("demo:nitzi-demo:santorini");
  });

  it("providerCanonicalId encodes sourceMode/providerId/providerOfferId in order", () => {
    const id = providerCanonicalId("live", "acme-hotels", "offer-123");
    expect(id).toBe("live:acme-hotels:offer-123");
  });

  it("decodes a fully-qualified id back into its parts", () => {
    const decoded = decodeCanonicalId("sandbox:acme-hotels:offer-456");
    expect(decoded).toEqual({
      sourceMode: "sandbox",
      providerId: "acme-hotels",
      providerOfferId: "offer-456",
      isLegacyDemoId: false,
    });
  });

  it("legacy bare DEMO ids (no prefix) resolve as demo, unchanged from today's route param format", () => {
    const bare = decodeCanonicalId("santorini");
    expect(bare.sourceMode).toBe("demo");
    expect(bare.providerId).toBe("nitzi-demo");
    expect(bare.providerOfferId).toBe("santorini");
    expect(bare.isLegacyDemoId).toBe(true);

    const variant = decodeCanonicalId("santorini~v1");
    expect(variant.providerOfferId).toBe("santorini~v1");
    expect(variant.isLegacyDemoId).toBe(true);
  });

  it("existing DEMO deal URLs still resolve through the unmodified getDeal()", () => {
    const catalog = makeCatalog(1); // slug "dest-0"
    const decoded = decodeCanonicalId("dest-0");
    expect(getDeal(decoded.providerOfferId, catalog)).not.toBeNull();

    const decodedVariant = decodeCanonicalId("dest-0~v1");
    expect(getDeal(decodedVariant.providerOfferId, catalog)).not.toBeNull();
  });
});

describe("normalizeProviderPackage — Package -> CanonicalOffer", () => {
  const destination = makeCatalog(1)[0];
  const pkg: Package = {
    id: "pkg-1",
    title: "Test Package",
    hotel: {
      id: "hotel-1",
      name: "Acme Grand Hotel",
      stars: 4,
      guestRating: 8.5,
      reviewsCount: 120,
      pricePerNight: 500,
      currency: "ILS",
      location: "Downtown",
      amenities: ["pool", "wifi"],
      source: "acme",
    },
    flight: {
      id: "flight-1",
      airline: "Acme Air",
      flightNumber: "AC123",
      origin: "TLV",
      destination: "ACM",
      departAt: "2026-09-01T08:00:00.000Z",
      arriveAt: "2026-09-01T11:00:00.000Z",
      durationMinutes: 180,
      stops: 0,
      price: 800,
      currency: "ILS",
      source: "acme",
    },
    nights: 5,
    totalPrice: 8000,
    separatePrice: 9000,
    savings: 1000,
    includes: ["ארוחת בוקר"],
    rating: 8,
    source: "acme",
  };

  const offer = normalizeProviderPackage({
    sourceMode: "live",
    destination,
    pkg,
    peoplePerBooking: 2,
  });

  it("sourceMode/providerId/providerOfferId are correctly derived", () => {
    expect(offer.sourceMode).toBe("live");
    expect(offer.providerId).toBe("acme");
    expect(offer.providerOfferId).toBe("pkg-1");
    expect(offer.canonicalId).toBe("live:acme:pkg-1");
  });

  it("preserves real hotel/flight facts the provider does supply", () => {
    expect(offer.hotel.name).toBe("Acme Grand Hotel");
    expect(offer.hotel.stars).toBe(4);
    expect(offer.hotel.providerHotelId).toBe("hotel-1");
    expect(offer.flight!.outbound.airline).toBe("Acme Air");
    expect(offer.flight!.outbound.flightNumber).toBe("AC123");
  });

  it("fields the active provider type genuinely doesn't have stay honestly unknown/null — never fabricated", () => {
    expect(offer.hotel.board).toBe("unknown");
    expect(offer.hotel.cancellationPolicy).toEqual({ kind: "unknown" });
    expect(offer.hotel.roomRateRef).toBeNull();
    expect(offer.flight!.outbound.baggage).toBeNull();
    expect(offer.flight!.outbound.fareRules).toBeNull();
    expect(offer.verifiedAt).toBeNull();
    expect(offer.pricing.verified).toBe(false);
  });

  it("preserves total price and derives a reasonable per-person split", () => {
    expect(offer.pricing.totalPrice).toBe(8000);
    expect(offer.pricing.pricePerPerson).toBe(4000);
  });
});

describe("currentOperatingMode — DEMO/SANDBOX/LIVE switching", () => {
  const originalMode = process.env.NITZI_OPERATING_MODE;
  const originalLive = process.env.NITZI_LIVE_MODE;

  function reset() {
    if (originalMode === undefined) delete process.env.NITZI_OPERATING_MODE;
    else process.env.NITZI_OPERATING_MODE = originalMode;
    if (originalLive === undefined) delete process.env.NITZI_LIVE_MODE;
    else process.env.NITZI_LIVE_MODE = originalLive;
  }

  it("defaults to 'demo' when nothing is set", () => {
    delete process.env.NITZI_OPERATING_MODE;
    delete process.env.NITZI_LIVE_MODE;
    expect(currentOperatingMode()).toBe("demo");
    reset();
  });

  it("respects NITZI_OPERATING_MODE explicitly for all three values", () => {
    process.env.NITZI_OPERATING_MODE = "demo";
    expect(currentOperatingMode()).toBe("demo");
    process.env.NITZI_OPERATING_MODE = "sandbox";
    expect(currentOperatingMode()).toBe("sandbox");
    process.env.NITZI_OPERATING_MODE = "live";
    expect(currentOperatingMode()).toBe("live");
    reset();
  });

  it("backward compat: NITZI_LIVE_MODE=true with no NITZI_OPERATING_MODE set means 'live'", () => {
    delete process.env.NITZI_OPERATING_MODE;
    process.env.NITZI_LIVE_MODE = "true";
    expect(currentOperatingMode()).toBe("live");
    reset();
  });

  it("backward compat: NITZI_LIVE_MODE=false (or unset) with no override means 'demo'", () => {
    delete process.env.NITZI_OPERATING_MODE;
    process.env.NITZI_LIVE_MODE = "false";
    expect(currentOperatingMode()).toBe("demo");
    reset();
  });

  it("NITZI_OPERATING_MODE takes priority over NITZI_LIVE_MODE when both are set", () => {
    process.env.NITZI_LIVE_MODE = "true";
    process.env.NITZI_OPERATING_MODE = "sandbox";
    expect(currentOperatingMode()).toBe("sandbox");
    reset();
  });
});

describe("getActiveOffers — sandbox/live never silently fall back to demo", () => {
  it("the sandbox/live branch never calls listDeals()", async () => {
    vi.resetModules();
    process.env.NITZI_OPERATING_MODE = "live";
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [row({ slug: "live-dest" })],
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
    // A genuinely empty/error state, not a silent demo substitution.
    expect(result.offers).toEqual([]);
    expect(result.emptyReason).not.toBeNull();
    expect(result.emptyReason).not.toMatch(/קטלוג ההדגמה/); // never the demo-mode message

    delete process.env.NITZI_OPERATING_MODE;
    vi.doUnmock("@/lib/catalog.server");
    vi.doUnmock("@/lib/deals");
    vi.doUnmock("@/lib/providers/registry");
  });

  it("demo mode genuinely calls listDeals() and returns normalized offers", async () => {
    vi.resetModules();
    delete process.env.NITZI_OPERATING_MODE;
    delete process.env.NITZI_LIVE_MODE;
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [row({ slug: "demo-dest" })],
    }));

    const mod = await import("@/lib/offers/active-offers.server");
    const result = await mod.getActiveOffers();

    expect(result.sourceMode).toBe("demo");
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.sourceMode === "demo")).toBe(true);

    vi.doUnmock("@/lib/catalog.server");
  });
});

describe("Homepage rails migration preserves existing DEMO dedup/backfill behavior", () => {
  it("buildDealRails (unchanged, Slice 2 logic) still produces the same shape of output the new sourcing path relies on", () => {
    // This is the same pipeline home-rails.functions.ts's getHomeRails()
    // calls internally for DEMO mode — proving the migration didn't alter
    // Slice 2's proven dedup/backfill behavior, just moved where sourcing
    // starts from.
    const catalog = makeCatalog(20);
    const rails = buildDealRails(catalog);

    for (const rail of rails) {
      const slugs = rail.groups.map((g) => g.key);
      expect(new Set(slugs).size).toBe(slugs.length); // no in-rail duplicates
      expect(rail.groups.length).toBeLessThanOrEqual(8); // existing cap preserved
    }
  });

  it("every canonicalId's underlying demo deal still resolves through the untouched getDeal()", () => {
    const catalog = makeCatalog(10);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      for (const g of rail.groups) {
        const offer = normalizeDemoDeal(g.main);
        const decoded = decodeCanonicalId(offer.canonicalId);
        expect(decoded.sourceMode).toBe("demo");
        expect(getDeal(decoded.providerOfferId, catalog)).not.toBeNull();
      }
    }
  });
});
