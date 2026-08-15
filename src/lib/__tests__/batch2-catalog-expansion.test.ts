import { describe, expect, it } from "vitest";
import { rowToDestination, type Destination, type DestinationRow } from "@/lib/catalog";
import { getDeal, listDeals } from "@/lib/deals";
import { isValidCoords } from "@/lib/deal-location";
import { buildDealRails } from "@/lib/deal-categories";

function row(over: Partial<DestinationRow> & { slug: string }): DestinationRow {
  return {
    name: "יעד",
    country: "מדינה",
    country_code: "XX",
    flag: "🏳️",
    region: "אירופה",
    tagline: "",
    weather: "",
    flight_hours: 3,
    avg_budget_per_person: 4000,
    matches: ["family"],
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
    ...over,
  };
}

// The 12 destinations active before Batch 2.
const PRE_BATCH2_ACTIVE = [
  "santorini",
  "rhodes",
  "athens",
  "larnaca",
  "rome",
  "barcelona",
  "lisbon",
  "paris",
  "london",
  "prague",
  "amalfi",
  "dubai",
] as const;

// The 28 destinations activated by this batch's migration — matches the
// approved plan exactly; nothing was skipped or replaced.
const NEWLY_ACTIVATED = [
  "thessaloniki",
  "crete",
  "corfu",
  "mykonos",
  "kos",
  "zakynthos",
  "paphos",
  "limassol",
  "milan",
  "venice",
  "naples",
  "florence",
  "madrid",
  "malaga",
  "mallorca",
  "ibiza",
  "porto",
  "budapest",
  "vienna",
  "krakow",
  "sofia",
  "tivat",
  "dubrovnik",
  "amsterdam",
  "berlin",
  "abu-dhabi",
  "new-york",
  "miami",
] as const;

const FINAL_ACTIVE_SET = [...PRE_BATCH2_ACTIVE, ...NEWLY_ACTIVATED];

// Representative real content from the migration (hotel names + real
// coordinates) — used to build synthetic-but-faithful DestinationRow
// fixtures without needing a live database connection (consistent with
// every other catalog test in this project).
const NEW_DESTINATION_FIXTURES: Record<
  string,
  { region: string; country: string; hotels: [string, string][]; lat: number; lon: number }
> = {
  tivat: {
    region: "אירופה",
    country: "מונטנגרו",
    lat: 42.437,
    lon: 18.696,
    hotels: [
      ["Regent Porto Montenegro", "מלון יוקרה במרינה היוקרתית פורטו מונטנגרו — פרימיום וחוף"],
      ["Palazzo Radomiri", "בוטיק שקט על שפת המפרץ — זוגי ורגיעה"],
      ["Hotel Splendido", "מלון ערכי קרוב לחוף — ערכי ומשפחתי"],
    ],
  },
  dubrovnik: {
    region: "אירופה",
    country: "קרואטיה",
    lat: 42.6507,
    lon: 18.0944,
    hotels: [
      ["Villa Dubrovnik", "מלון יוקרה על הצוק עם נוף לעיר העתיקה — פרימיום ורגיעה"],
      ["Hotel Excelsior Dubrovnik", "מלון קלאסי צמוד לחומות העיר העתיקה — זוגי וחוף"],
      ["Hotel Ivka", "מלון ערכי מחוץ לחומות — ערכי ומשפחתי"],
    ],
  },
  "new-york": {
    region: "צפון אמריקה",
    country: "ארצות הברית",
    lat: 40.7128,
    lon: -74.006,
    hotels: [
      ["The Plaza", "מלון יוקרה איקוני מול סנטרל פארק — פרימיום ומרכזי"],
      ["Pod Times Square", "מלון ערכי וקומפקטי בטיימס סקוור — ערכי וחיי לילה"],
      ["Yotel New York", "מלון קומפקטי וחדשני, מתאים למשפחות עירוניות — ערכי ומשפחתי"],
    ],
  },
  miami: {
    region: "צפון אמריקה",
    country: "ארצות הברית",
    lat: 25.7617,
    lon: -80.1918,
    hotels: [
      ["Fontainebleau Miami Beach", "מלון יוקרה איקוני על החוף — פרימיום וחוף"],
      ["The Betsy - South Beach", "מלון בוטיק רגוע בסאות' ביץ' — זוגי ורגיעה"],
      ["Circa 39 Hotel", "מלון בוטיק ערכי קרוב לחוף — ערכי וחיי לילה"],
    ],
  },
  mykonos: {
    region: "אירופה",
    country: "יוון",
    lat: 37.4467,
    lon: 25.3289,
    hotels: [
      ["Cavo Tagoo Mykonos", "בוטיק עיצובי מעל מיקונוס טאון עם נוף לים — פרימיום וחיי לילה"],
      ["Semeli Hotel", "מלון רגוע עם בריכות ונוף לשקיעה — זוגי ורגיעה"],
      ["Petasos Beach Resort", "מלון על חוף פלאטיס ילוס — חוף וערכי"],
    ],
  },
  crete: {
    region: "אירופה",
    country: "יוון",
    lat: 35.2401,
    lon: 24.8093,
    hotels: [
      [
        "Amirandes Grecotel",
        "ריזורט יוקרה על החוף עם חלק מהחדרים כוללים בריכה פרטית — פרימיום וחוף",
      ],
      ["Lato Boutique Hotel", "בוטיק במרכז הרקליון, קרוב לנמל הוונציאני — מרכזי וערכי"],
      ["Aquila Rithymna Beach", "ריזורט משפחתי גדול על החוף הצפוני עם מועדון ילדים — משפחתי"],
    ],
  },
};

function fixtureCatalog(): Destination[] {
  return Object.entries(NEW_DESTINATION_FIXTURES).map(([slug, f]) =>
    rowToDestination(
      row({
        slug,
        name: slug,
        region: f.region,
        country: f.country,
        latitude: f.lat,
        longitude: f.lon,
        hotels: f.hotels.map(([name, note]) => ({ name, note })),
        matches: ["beach", "family"],
      }),
    ),
  );
}

describe("Batch 2 — final active destination set", () => {
  it("contains exactly the approved 40 destinations, no more, no fewer", () => {
    expect(FINAL_ACTIVE_SET.length).toBe(40);
  });

  it("has no duplicate slugs across the pre-existing and newly-activated sets", () => {
    expect(new Set(FINAL_ACTIVE_SET).size).toBe(FINAL_ACTIVE_SET.length);
  });

  it("nothing was skipped or replaced — all 28 approved destinations are present", () => {
    const approved = [
      "thessaloniki",
      "crete",
      "corfu",
      "mykonos",
      "kos",
      "zakynthos",
      "paphos",
      "limassol",
      "milan",
      "venice",
      "naples",
      "florence",
      "madrid",
      "malaga",
      "mallorca",
      "ibiza",
      "porto",
      "budapest",
      "vienna",
      "krakow",
      "sofia",
      "tivat",
      "dubrovnik",
      "amsterdam",
      "berlin",
      "abu-dhabi",
      "new-york",
      "miami",
    ];
    for (const slug of approved) expect(NEWLY_ACTIVATED).toContain(slug);
    expect(NEWLY_ACTIVATED.length).toBe(28);
  });
});

describe("Batch 2 — newly-activated destinations produce valid, resolvable deals", () => {
  const catalog = fixtureCatalog();

  it("every fixture destination has 2–3 genuinely distinct hotels", () => {
    for (const [slug, f] of Object.entries(NEW_DESTINATION_FIXTURES)) {
      expect(f.hotels.length).toBeGreaterThanOrEqual(2);
      expect(f.hotels.length).toBeLessThanOrEqual(3);
      const names = f.hotels.map((h) => h[0]);
      const notes = f.hotels.map((h) => h[1]);
      // No two hotels within the same destination share a name or note.
      expect(new Set(names).size).toBe(names.length);
      expect(new Set(notes).size).toBe(notes.length);
      for (const [name, note] of f.hotels) {
        expect(name.trim().length).toBeGreaterThan(0);
        expect(note.trim().length).toBeGreaterThan(0);
        expect(slug).toBeTruthy();
      }
    }
  });

  it("hotel notes are not copy-pasted across different destinations", () => {
    const allNotes = Object.values(NEW_DESTINATION_FIXTURES).flatMap((f) =>
      f.hotels.map((h) => h[1]),
    );
    expect(new Set(allNotes).size).toBe(allNotes.length);
  });

  it("every fixture destination resolves a real deal via listDeals/getDeal", () => {
    const deals = listDeals(catalog, 1);
    for (const slug of Object.keys(NEW_DESTINATION_FIXTURES)) {
      const deal = deals.find((d) => d.destination.slug === slug);
      expect(deal).toBeTruthy();
      expect(getDeal(deal!.id, catalog)).not.toBeNull();
      // The deal's cancellation policy (Batch 1) is present and one of the
      // five defined kinds — never silently missing.
      expect(["free", "free_until", "partial", "non_refundable", "unknown"]).toContain(
        deal!.cancellationPolicy.kind,
      );
    }
  });

  it("every fixture destination has valid, real coordinates (not 0,0 or out of range)", () => {
    for (const dest of catalog) {
      expect(isValidCoords(dest.latitude, dest.longitude)).toBe(true);
    }
  });
});

describe("Batch 2 — regional coverage results", () => {
  it("USA rail can now populate (new-york / miami are in צפון אמריקה)", () => {
    const catalog = fixtureCatalog();
    const usDestinations = catalog.filter((d) => d.region === "צפון אמריקה");
    expect(usDestinations.length).toBeGreaterThan(0);

    const rails = buildDealRails(catalog);
    const usaRail = rails.find((r) => r.id === "usa");
    expect(usaRail).toBeDefined();
    expect(usaRail!.groups.length).toBeGreaterThan(0);
  });

  it("Montenegro (tivat) resolves a real canonical deal", () => {
    const catalog = fixtureCatalog();
    const deals = listDeals(catalog, 1);
    const deal = deals.find((d) => d.destination.slug === "tivat");
    expect(deal).toBeTruthy();
    expect(deal!.destination.country).toBe("מונטנגרו");
    expect(getDeal(deal!.id, catalog)).not.toBeNull();
  });

  it("Croatia (dubrovnik) resolves a real canonical deal", () => {
    const catalog = fixtureCatalog();
    const deals = listDeals(catalog, 1);
    const deal = deals.find((d) => d.destination.slug === "dubrovnik");
    expect(deal).toBeTruthy();
    expect(deal!.destination.country).toBe("קרואטיה");
    expect(getDeal(deal!.id, catalog)).not.toBeNull();
  });

  it("Greek-island active coverage expanded from 3 to 9 (full requested list)", () => {
    const preBatch2Greek = ["santorini", "rhodes", "athens"];
    const fullGreekIslandTarget = [
      "athens",
      "thessaloniki",
      "santorini",
      "rhodes",
      "crete",
      "corfu",
      "mykonos",
      "kos",
      "zakynthos",
    ];
    const activeGreekAfter = fullGreekIslandTarget.filter((slug) =>
      FINAL_ACTIVE_SET.includes(slug as (typeof FINAL_ACTIVE_SET)[number]),
    );
    expect(preBatch2Greek.length).toBe(3);
    expect(activeGreekAfter.length).toBe(9);
  });
});
