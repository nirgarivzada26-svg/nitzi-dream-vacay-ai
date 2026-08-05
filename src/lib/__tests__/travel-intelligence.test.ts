import { describe, expect, it } from "vitest";
import { rowToDestination, type Destination, type DestinationRow } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { scoreBreakdown, NO_DATA } from "@/lib/deal-scores";
import { buildComparisons } from "@/lib/deal-comparison";
import { travelTips } from "@/lib/destination-tips";
import { bookTiming } from "@/lib/book-timing";

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
    matches: ["beach"],
    is_popular: true,
    has_offers: true,
    hotels: [{ name: "מלון בדיקה", note: "מרכזי" }],
    attractions: ["חוף העיר", "שוק מרכזי"],
    restaurants: ["מסעדת דגים"],
    itinerary: ["יום ראשון בעיר העתיקה"],
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
    direct_flight_from_tlv: true,
    provider_supported: true,
    demo_supported: true,
    is_featured: false,
    is_trending: false,
    ...over,
  };
}

const catalog: Destination[] = [
  rowToDestination(row({ slug: "athens", name: "אתונה" })),
  rowToDestination(row({ slug: "rhodes", name: "רודוס", avg_budget_per_person: 2600 })),
  rowToDestination(
    row({
      slug: "lisbon",
      name: "ליסבון",
      country_code: "PT",
      attractions: [],
      restaurants: [],
      itinerary: [],
      tagline: "",
      short_description: "",
      travel_categories: [],
      matches: [],
      direct_flight_from_tlv: false,
    }),
  ),
];

const deals = listDeals(catalog, 3);

describe("Slice 3.5 — travel intelligence is catalog-backed", () => {
  it("never scores a metric that has no backing field", () => {
    for (const deal of deals) {
      const peers = deals.filter((d) => d.destination.slug === deal.destination.slug);
      const b = scoreBreakdown(deal, peers);
      for (const g of b.groups)
        for (const m of g.metrics) if (m.value === null) expect(m.basis).toContain(NO_DATA);
      expect(b.coverage.scored).toBeLessThanOrEqual(b.coverage.total);
    }
  });

  it("only compares against real catalog deals, never the deal itself, never twice", () => {
    for (const deal of deals) {
      const ids = buildComparisons(deal, deals).map((c) => c.deal.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain(deal.id);
    }
  });

  it("marks tip categories without data as unavailable instead of inventing text", () => {
    for (const dest of catalog)
      for (const c of travelTips(dest)) if (!c.available) expect(c.items).toHaveLength(0);
  });

  it("returns no booking-timing verdict without enough observations", () => {
    expect(bookTiming(deals[0], [])).toBeNull();
  });
});
