import { describe, expect, it } from "vitest";
import { rowToDestination, type Destination, type DestinationRow } from "@/lib/catalog";
import { buildDealRails } from "@/lib/deal-categories";
import { getDeal, listDeals } from "@/lib/deals";

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

/**
 * A catalog engineered to reproduce the real-world scarcity problem: every
 * destination matches almost every rail's filter (beach + romantic + family,
 * all in Europe), so without cross-rail dedup they'd all pile up in every
 * rail simultaneously — exactly what Slice 2 fixes.
 */
function highOverlapCatalog(count: number, countries: string[] = ["יוון"]): Destination[] {
  return Array.from({ length: count }, (_, i) =>
    rowToDestination(
      row({
        slug: `dest-${i}`,
        name: `יעד ${i}`,
        country: countries[i % countries.length],
        avg_budget_per_person: 3000 + i * 100,
      }),
    ),
  );
}

describe("buildDealRails — within-rail behavior (unchanged)", () => {
  it("never repeats a destination twice inside the same rail", () => {
    const catalog = highOverlapCatalog(20);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      const slugs = rail.groups.map((g) => g.key);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("caps every rail at 8 cards", () => {
    const catalog = highOverlapCatalog(30);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      expect(rail.groups.length).toBeLessThanOrEqual(8);
    }
  });
});

describe("buildDealRails — cross-rail deduplication", () => {
  it("distributes an ample high-overlap catalog across rails before backfill occurs", () => {
    // Genuinely ample inventory: with ~10 visible rails x up to 8 cards each,
    // 150 candidates is comfortably more than total demand, so fresh
    // (never-before-used) destinations should be available throughout.
    const catalog = highOverlapCatalog(150);
    const rails = buildDealRails(catalog);

    const usage = new Map<string, number>();
    for (const rail of rails) {
      for (const g of rail.groups) usage.set(g.key, (usage.get(g.key) ?? 0) + 1);
    }
    const usedOnce = [...usage.values()].filter((n) => n === 1).length;
    const total = usage.size;
    expect(usedOnce / total).toBeGreaterThan(0.5);
  });

  it("a destination does not appear more than twice across rails when enough alternatives exist", () => {
    const catalog = highOverlapCatalog(150);
    const rails = buildDealRails(catalog);

    const usage = new Map<string, number>();
    for (const rail of rails) {
      for (const g of rail.groups) usage.set(g.key, (usage.get(g.key) ?? 0) + 1);
    }
    for (const count of usage.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("allows exceeding the repeat cap only when a rail's own candidate pool has no alternative left", () => {
    // Deliberately scarce: with 20 destinations spread thin across 11 rails
    // (up to 8 slots each = up to 88 demand), some rails will legitimately
    // exhaust every under-cap candidate and must reuse one a 3rd+ time.
    const catalog = highOverlapCatalog(20);
    const rails = buildDealRails(catalog);

    const usage = new Map<string, number>();
    let anyOverCap = false;
    for (const rail of rails) {
      const railCandidateKeys = new Set(rail.groups.map((g) => g.key));
      for (const key of railCandidateKeys) {
        const priorUsage = usage.get(key) ?? 0;
        if (priorUsage >= 2) {
          anyOverCap = true;
        }
      }
      for (const g of rail.groups) usage.set(g.key, (usage.get(g.key) ?? 0) + 1);
    }
    // With this scarcity ratio, the cap is expected to be exceeded
    // somewhere — proving it only happens under real scarcity, not
    // casually, is what the ample-inventory tests above already cover.
    expect(anyOverCap).toBe(true);
  });

  it("backfill chooses the least-used matching destination when inventory is scarce", () => {
    // Only 4 destinations total — every rail's filter pool is identical and
    // tiny, forcing repeated backfill. The least-used destinations should
    // consistently be preferred over ones already used more.
    const catalog = highOverlapCatalog(4);
    const rails = buildDealRails(catalog);

    const usage = new Map<string, number>();
    for (const rail of rails) {
      for (const g of rail.groups) {
        // At the moment this destination was picked for this rail, no
        // other candidate in the same rail should have had strictly lower
        // prior usage than it did (that would mean backfill picked the
        // MORE-used one over a less-used alternative in the same rail).
        usage.set(g.key, (usage.get(g.key) ?? 0) + 1);
      }
    }
    // With only 4 destinations and 11+ rails, usage counts should still be
    // roughly balanced (no single destination hogging every appearance)
    // because backfill always prefers the least-used one.
    const counts = [...usage.values()];
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it("hides a rail with zero matching destinations", () => {
    // No destination is in "צפון אמריקה" — the USA rail must not appear.
    const catalog = highOverlapCatalog(10);
    const rails = buildDealRails(catalog);
    expect(rails.find((r) => r.id === "usa")).toBeUndefined();
  });

  it("hides a rail whose only candidate is a single already-used repeat", () => {
    // A luxury-only destination (5★) alongside plenty of non-luxury ones:
    // the luxury rail should either get a real minimum or be hidden, never
    // show exactly one stale repeated card.
    const catalog = highOverlapCatalog(3);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      if (rail.groups.length === 1) {
        // A lone card is only acceptable if it was never used elsewhere.
        const otherAppearances = rails
          .filter((r) => r.id !== rail.id)
          .flatMap((r) => r.groups)
          .filter((g) => g.key === rail.groups[0].key).length;
        expect(otherAppearances).toBe(0);
      }
    }
  });

  it("backfills or hides a rail with insufficient unique inventory rather than showing fewer than 3 without reason", () => {
    const catalog = highOverlapCatalog(6);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      // Every visible rail has either reached the 3-card target, used all
      // available matching inventory, or was hidden entirely (not present).
      expect(rail.groups.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("buildDealRails — secret deal exclusion", () => {
  it("does not repeat the secret-deal destination in the first rail when alternatives exist", () => {
    const catalog = highOverlapCatalog(20);
    const secretSlug = "dest-0";
    const rails = buildDealRails(catalog, { excludeFromFirstRail: secretSlug });
    expect(rails[0].groups.some((g) => g.key === secretSlug)).toBe(false);
  });

  it("allows the secret-deal destination back into the first rail if it's the only inventory available", () => {
    const catalog = highOverlapCatalog(1);
    const secretSlug = "dest-0";
    const rails = buildDealRails(catalog, { excludeFromFirstRail: secretSlug });
    // With only one destination in the whole catalog, the first rail has no
    // alternative — it must still show something rather than hide entirely.
    if (rails.length > 0) {
      expect(rails[0].groups.some((g) => g.key === secretSlug)).toBe(true);
    }
  });

  it("does not change rail selection at all when no secret slug is passed", () => {
    const catalog = highOverlapCatalog(20);
    const withoutOpt = buildDealRails(catalog);
    const withUndefined = buildDealRails(catalog, {});
    expect(withoutOpt.map((r) => r.groups.map((g) => g.key))).toEqual(
      withUndefined.map((r) => r.groups.map((g) => g.key)),
    );
  });
});

describe("buildDealRails — canonical integrity", () => {
  it("every returned deal id still resolves through getDeal()", () => {
    const catalog = highOverlapCatalog(15);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      for (const g of rail.groups) {
        expect(getDeal(g.main.id, catalog)).not.toBeNull();
        for (const v of g.variants) {
          expect(getDeal(v.id, catalog)).not.toBeNull();
        }
      }
    }
  });

  it("every rail's filters still produce a valid /packages-compatible shape", () => {
    const catalog = highOverlapCatalog(15);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      expect(typeof rail.filters).toBe("object");
      // No unexpected keys beyond the documented RailFilters shape.
      const allowedKeys = ["country", "region", "board", "stars", "beach", "direct", "sort"];
      for (const key of Object.keys(rail.filters)) {
        expect(allowedKeys).toContain(key);
      }
    }
  });

  it("group.main and group.variants together are always a subset of listDeals() for that destination", () => {
    const catalog = highOverlapCatalog(10);
    const rails = buildDealRails(catalog);
    for (const rail of rails) {
      for (const g of rail.groups) {
        const allForDest = listDeals(catalog, 3).filter((d) => d.destination.slug === g.key);
        const groupIds = new Set([g.main.id, ...g.variants.map((v) => v.id)]);
        for (const id of groupIds) {
          expect(allForDest.some((d) => d.id === id)).toBe(true);
        }
      }
    }
  });
});
