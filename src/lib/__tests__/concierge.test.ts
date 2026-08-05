import { describe, expect, it } from "vitest";
import { rowToDestination, type Destination, type DestinationRow } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { buildItinerary } from "@/lib/concierge/itinerary";
import { tripCost, NOT_ENOUGH_DATA } from "@/lib/concierge/trip-cost";
import { audienceFor } from "@/lib/concierge/audience";
import { weatherSummary } from "@/lib/concierge/weather";
import { experienceProfile } from "@/lib/concierge/experience";
import { savingTips } from "@/lib/concierge/saving-tips";
import { alternativeDestinations } from "@/lib/concierge/alternative-destinations";
import { conciergeMessage } from "@/lib/concierge/message";

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד",
    country: "יוון",
    country_code: "GR",
    flag: "🇬🇷",
    region: "אירופה",
    tagline: "חופים ועיר עתיקה",
    weather: "29° בהיר",
    flight_hours: 3.5,
    avg_budget_per_person: 4200,
    matches: ["beach"],
    is_popular: true,
    has_offers: true,
    hotels: [{ name: "מלון בדיקה", note: "מרכזי" }],
    attractions: ["חוף העיר", "העיר העתיקה"],
    restaurants: ["מסעדת דגים"],
    itinerary: ["סיור בעיר העתיקה"],
    sort_order: 1,
    city_en: "City",
    country_en: "Greece",
    subregion: "Southern Europe",
    airport_codes: ["ABC"],
    latitude: 36,
    longitude: 28,
    timezone: "Europe/Athens",
    currency: "EUR",
    languages: ["Greek"],
    image_url: null,
    short_description: "תיאור קצר",
    best_travel_months: [5, 6, 7, 8, 9],
    average_trip_duration: 5,
    travel_categories: ["beach", "island"],
    direct_flight_from_tlv: true,
    provider_supported: true,
    demo_supported: true,
    is_featured: false,
    is_trending: false,
    ...over,
  };
}

const rich = rowToDestination(row({ slug: "rhodes", name: "רודוס" }));
const bare = rowToDestination(
  row({
    slug: "empty-town",
    name: "יעד ריק",
    weather: "",
    attractions: [],
    restaurants: [],
    itinerary: [],
    travel_categories: [],
    matches: [],
    best_travel_months: [],
    average_trip_duration: null,
    avg_budget_per_person: 0,
  }),
);
const neighbour = rowToDestination(row({ slug: "kos", name: "קוס" }));
const catalog: Destination[] = [rich, bare, neighbour];
const deals = listDeals(catalog, 3);
const richDeals = deals.filter((d) => d.destination.slug === "rhodes");
const bareDeals = deals.filter((d) => d.destination.slug === "empty-town");

describe("Slice 3.6 — concierge itinerary", () => {
  it("covers every night plus arrival and departure days", () => {
    for (const d of richDeals) {
      const days = buildItinerary(d);
      expect(days).toHaveLength(d.dates.nights + 1);
      expect(days[0].slots.some((s) => s.kind === "arrival")).toBe(true);
      expect(days.at(-1)!.slots.some((s) => s.kind === "departure")).toBe(true);
    }
  });

  it("never names a business that is not in the catalog", () => {
    const allowed = new Set([...rich.restaurants, ...rich.attractions, ...rich.itinerary]);
    for (const day of buildItinerary(richDeals[0]))
      for (const s of day.slots)
        if (s.source.includes("restaurants") || s.source.includes("attractions") || s.source.includes("itinerary"))
          expect(allowed.has(s.title)).toBe(true);
  });

  it("still produces a valid plan for a destination with no content", () => {
    const days = buildItinerary(bareDeals[0]);
    expect(days.length).toBeGreaterThan(1);
    for (const day of days)
      for (const s of day.slots) expect(s.source.length).toBeGreaterThan(0);
  });
});

describe("Slice 3.6 — cost, audience, weather, experience", () => {
  it("marks unbacked cost categories as missing instead of estimating", () => {
    const c = tripCost(richDeals[0]);
    for (const l of c.lines) if (l.cents === null) expect(l.source).toBe(NOT_ENOUGH_DATA);
    expect(c.missing).toContain("אוכל");
  });

  it("omits the ground estimate when the catalog has no average budget", () => {
    expect(tripCost(bareDeals[0]).groundCents).toBeNull();
  });

  it("cites a structured source for every audience flag", () => {
    const { fits, avoid } = audienceFor(richDeals[0]);
    for (const f of [...fits, ...avoid]) {
      expect(f.reason.length).toBeGreaterThan(0);
      expect(f.source.length).toBeGreaterThan(0);
    }
  });

  it("never invents water temperature or rain probability", () => {
    const facts = weatherSummary(rich);
    expect(facts.find((f) => f.key === "water")!.value).toBeNull();
    expect(facts.find((f) => f.key === "rain")!.value).toBeNull();
    expect(facts.find((f) => f.key === "air")!.value).toBe("29° בהיר");
  });

  it("scores 12 experience dimensions and nulls the unbacked ones", () => {
    expect(experienceProfile(richDeals[0])).toHaveLength(12);
    const bareProfile = experienceProfile(bareDeals[0]);
    expect(bareProfile.filter((d) => d.value === null).length).toBeGreaterThan(0);
    for (const d of bareProfile) if (d.value !== null) expect(d.basis.length).toBeGreaterThan(0);
  });
});

describe("Slice 3.6 — savings, alternatives, closing message", () => {
  it("only produces saving tips backed by a real peer offer", () => {
    for (const t of savingTips(richDeals[0], deals))
      expect(deals.some((d) => d.id === t.dealId)).toBe(true);
    expect(savingTips(richDeals[0], [])).toHaveLength(0);
  });

  it("suggests only bookable, non-identical destinations with reasons", () => {
    for (const a of alternativeDestinations(rich, catalog)) {
      expect(a.destination.slug).not.toBe(rich.slug);
      expect(a.destination.hasOffers).toBe(true);
      expect(a.reasons.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("returns no closing message without at least two structured reasons", () => {
    const msg = conciergeMessage(richDeals[0], deals);
    if (msg) {
      expect(msg.reasons.length).toBeGreaterThanOrEqual(2);
      for (const r of msg.reasons) expect(r.source.length).toBeGreaterThan(0);
    }
  });
});
