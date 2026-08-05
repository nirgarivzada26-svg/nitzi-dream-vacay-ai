import { describe, expect, it } from "vitest";
import { rowToDestination, type DestinationRow } from "@/lib/catalog";
import {
  auditCatalog,
  destinationIssues,
  isFlightDestination,
  validDestinations,
} from "@/lib/destination-validation";
import { matchesFacet, scoreDestination, searchDestinations } from "@/lib/destination-search";

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד",
    country: "מדינה",
    country_code: "GR",
    flag: "🇬🇷",
    region: "אירופה",
    tagline: "תיאור",
    weather: "28°",
    flight_hours: 4,
    avg_budget_per_person: 3000,
    matches: ["beach"],
    is_popular: false,
    has_offers: false,
    hotels: [],
    attractions: [],
    restaurants: [],
    itinerary: [],
    sort_order: 1,
    city_en: "City",
    country_en: "Greece",
    subregion: "Southern Europe",
    airport_codes: ["ABC"],
    latitude: 37,
    longitude: 23,
    timezone: "Europe/Athens",
    currency: "EUR",
    languages: ["Greek"],
    image_url: null,
    short_description: "תיאור קצר",
    best_travel_months: [6, 7],
    average_trip_duration: 5,
    travel_categories: ["beach"],
    direct_flight_from_tlv: false,
    provider_supported: false,
    demo_supported: false,
    is_featured: false,
    is_trending: false,
    ...over,
  };
}

const athens = rowToDestination(
  row({
    slug: "athens",
    name: "אתונה",
    city_en: "Athens",
    airport_codes: ["ATH"],
    latitude: 37.9838,
    longitude: 23.7275,
    direct_flight_from_tlv: true,
    is_popular: true,
    travel_categories: ["city"],
  }),
);
const bangkok = rowToDestination(
  row({
    slug: "bangkok",
    name: "בנגקוק",
    city_en: "Bangkok",
    country: "תאילנד",
    country_en: "Thailand",
    country_code: "TH",
    region: "אסיה",
    subregion: "Southeast Asia",
    airport_codes: ["BKK", "DMK"],
    latitude: 13.7563,
    longitude: 100.5018,
    direct_flight_from_tlv: true,
    timezone: "Asia/Bangkok",
    currency: "THB",
    travel_categories: ["city"],
  }),
);
const santorini = rowToDestination(
  row({
    slug: "santorini",
    name: "סנטוריני",
    city_en: "Santorini",
    airport_codes: ["JTR"],
    latitude: 36.3932,
    longitude: 25.4615,
    travel_categories: ["island", "beach"],
  }),
);
const newYork = rowToDestination(
  row({
    slug: "new-york",
    name: "ניו יורק",
    city_en: "New York",
    country: "ארצות הברית",
    country_en: "United States",
    country_code: "US",
    region: "צפון אמריקה",
    subregion: "North America",
    airport_codes: ["JFK", "EWR"],
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    currency: "USD",
    travel_categories: ["city"],
  }),
);

const catalog = [athens, bangkok, santorini, newYork];

describe("destination validation", () => {
  it("accepts a well-formed destination", () => {
    expect(destinationIssues(athens)).toEqual([]);
    expect(isFlightDestination(athens)).toBe(true);
  });

  it("blocks invalid coordinates", () => {
    const bad = rowToDestination(row({ slug: "bad", latitude: 999, longitude: 500 }));
    expect(destinationIssues(bad)).toContain("invalid-latitude");
    expect(destinationIssues(bad)).toContain("invalid-longitude");
    expect(validDestinations([athens, bad])).toEqual([athens]);
  });

  it("blocks duplicate slugs and duplicate city+country pairs", () => {
    const dupSlug = rowToDestination(row({ slug: "athens", city_en: "Athina" }));
    const dupCity = rowToDestination(row({ slug: "athens-2", city_en: "athens" }));
    const audit = auditCatalog([athens, dupSlug, dupCity]);
    expect(audit.valid).toHaveLength(1);
    expect(audit.rejected[0]?.issues).toContain("duplicate-slug");
    expect(audit.rejected[1]?.issues).toContain("duplicate-city");
  });

  it("blocks duplicate airport codes", () => {
    const clash = rowToDestination(row({ slug: "athens-alt", city_en: "Piraeus" }));
    const audit = auditCatalog([athens, { ...clash, airportCodes: ["ATH"] }]);
    expect(audit.valid).toHaveLength(1);
    expect(audit.rejected[0]?.issues).toContain("duplicate-airport-code");
  });

  it("treats destinations without their own airport as non-flight destinations", () => {
    const noAirport = { ...santorini, airportCodes: [] };
    expect(isFlightDestination(noAirport)).toBe(false);
  });

  it("rejects malformed country and currency codes", () => {
    const bad = rowToDestination(row({ slug: "bad2", country_code: "GRC", currency: "euro" }));
    expect(destinationIssues(bad)).toContain("invalid-country-code");
    expect(destinationIssues(bad)).toContain("invalid-currency");
  });
});

describe("destination search", () => {
  it("finds by Hebrew city name", () => {
    expect(searchDestinations(catalog, { query: "בנגקוק" }).map((d) => d.slug)).toEqual([
      "bangkok",
    ]);
  });

  it("finds by English city name, case-insensitively", () => {
    expect(searchDestinations(catalog, { query: "new york" }).map((d) => d.slug)).toEqual([
      "new-york",
    ]);
  });

  it("finds by airport code", () => {
    expect(searchDestinations(catalog, { query: "jtr" }).map((d) => d.slug)).toEqual(["santorini"]);
    expect(searchDestinations(catalog, { query: "DMK" }).map((d) => d.slug)).toEqual(["bangkok"]);
  });

  it("finds by country name in both languages", () => {
    expect(searchDestinations(catalog, { query: "Thailand" }).map((d) => d.slug)).toEqual([
      "bangkok",
    ]);
    expect(searchDestinations(catalog, { query: "ארצות הברית" }).map((d) => d.slug)).toEqual([
      "new-york",
    ]);
  });

  it("ranks an exact airport code above a loose text match", () => {
    expect(scoreDestination(bangkok, "BKK")).toBeGreaterThan(scoreDestination(bangkok, "תיאור"));
  });

  it("filters by region facet", () => {
    expect(searchDestinations(catalog, { facet: "asia" }).map((d) => d.slug)).toEqual(["bangkok"]);
    expect(searchDestinations(catalog, { facet: "usa" }).map((d) => d.slug)).toEqual(["new-york"]);
    expect(searchDestinations(catalog, { facet: "europe" }).map((d) => d.slug)).toEqual([
      "athens",
      "santorini",
    ]);
  });

  it("filters by direct-flight facet", () => {
    expect(searchDestinations(catalog, { facet: "direct" }).map((d) => d.slug)).toEqual([
      "athens",
      "bangkok",
    ]);
  });

  it("filters by island and city facets", () => {
    expect(matchesFacet(santorini, "islands")).toBe(true);
    expect(matchesFacet(athens, "islands")).toBe(false);
    expect(searchDestinations(catalog, { facet: "city" }).map((d) => d.slug)).toEqual([
      "athens",
      "bangkok",
      "new-york",
    ]);
  });

  it("never returns invalid destinations", () => {
    const broken = rowToDestination(row({ slug: "broken", latitude: 1000 }));
    expect(searchDestinations([...catalog, broken], { query: "יעד" }).map((d) => d.slug)).not.toContain(
      "broken",
    );
  });

  it("can restrict results to destinations we can fly to", () => {
    const noAirport = { ...newYork, slug: "no-air", airportCodes: [] };
    const list = searchDestinations([...catalog, noAirport], { flightOnly: true });
    expect(list.map((d) => d.slug)).not.toContain("no-air");
  });
});
