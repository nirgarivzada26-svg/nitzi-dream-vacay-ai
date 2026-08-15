import { describe, expect, it, vi } from "vitest";
import { rowToDestination, type DestinationRow } from "@/lib/catalog";
import { listDeals, type Deal } from "@/lib/deals";
import {
  advantageFor,
  alternativesWithin,
  compromiseFor,
  diagnoseBlockingConstraint,
  passesFilters,
} from "@/lib/agent/agent-search.server";
import type { AgentFilters } from "@/lib/agent/agent-types";
import { filtersSchema } from "@/routes/api/chat";

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

/** A real, catalog-generated Deal (not a hand-typed literal), with specific
 *  fields forced for deterministic assertions — same approach as starting
 *  from real data and adjusting only what the test needs to control. */
function makeDeal(slug: string, overrides: Partial<Deal> = {}): Deal {
  const catalog = [rowToDestination(row({ slug }))];
  const base = listDeals(catalog, 1)[0];
  return { ...base, ...overrides };
}

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

describe("context-only fields never affect passesFilters elimination", () => {
  it("a deal that passes without the new fields set also passes with them set", () => {
    const deal = makeDeal("neutral-a", {
      outbound: { ...makeDeal("neutral-a").outbound, stops: 1 },
    });
    const without = passesFilters(deal, NO_FILTERS);
    const withNewFields: AgentFilters = {
      ...NO_FILTERS,
      requestedDates: "אוגוסט",
      dateFlexibility: "fixed",
      childrenAges: [4, 7],
      baggagePreference: "checked",
    };
    expect(passesFilters(deal, withNewFields)).toBe(without);
  });

  it("a deal that fails a real filter still fails identically regardless of the new fields", () => {
    const deal = makeDeal("neutral-b", { hotel: { ...makeDeal("neutral-b").hotel, stars: 3 } });
    const base: AgentFilters = { ...NO_FILTERS, minStars: 5 };
    const withNewFields: AgentFilters = {
      ...base,
      requestedDates: "דצמבר",
      dateFlexibility: "very-flexible",
      childrenAges: [10],
      baggagePreference: "carry-on-only",
    };
    expect(passesFilters(deal, base)).toBe(false);
    expect(passesFilters(deal, withNewFields)).toBe(false);
  });

  it("setting only childrenAges/dates/baggage (no real filters) never excludes a deal that would otherwise pass", () => {
    const deal = makeDeal("neutral-c");
    const onlyContextFields: AgentFilters = {
      ...NO_FILTERS,
      requestedDates: "כל תאריך",
      dateFlexibility: "flexible",
      childrenAges: [2, 5, 9],
      baggagePreference: "checked",
    };
    expect(passesFilters(deal, onlyContextFields)).toBe(true);
  });
});

describe("advantageFor / compromiseFor — deterministic, real-data-only", () => {
  it("advantage names a direct flight within budget when both are true", () => {
    const base = makeDeal("adv-a");
    const deal = makeDeal("adv-a", {
      outbound: { ...base.outbound, stops: 0 },
      inbound: { ...base.inbound, stops: 0 },
      price: { ...base.price, perPerson: 3000 },
    });
    const f: AgentFilters = { ...NO_FILTERS, maxBudgetPerPerson: 5000 };
    expect(advantageFor(deal, f)).toContain("ישירה");
    expect(advantageFor(deal, f)).toContain("תקציב");
  });

  it("compromise names the connection when the flight isn't direct and there's no budget set", () => {
    const base = makeDeal("adv-b");
    const deal = makeDeal("adv-b", {
      outbound: { ...base.outbound, stops: 1 },
      inbound: { ...base.inbound, stops: 0 },
      freeCancellation: true,
      board: "all-inclusive",
    });
    expect(compromiseFor(deal, NO_FILTERS)).toMatch(/קונקשן/);
  });

  it("compromise names the budget overage first, even when the flight is also not direct", () => {
    const base = makeDeal("adv-c");
    const deal = makeDeal("adv-c", {
      outbound: { ...base.outbound, stops: 1 },
      price: { ...base.price, perPerson: 6000 },
    });
    const f: AgentFilters = { ...NO_FILTERS, maxBudgetPerPerson: 5000 };
    expect(compromiseFor(deal, f)).toMatch(/תקציב/);
  });

  it("compromise is null when there is genuinely nothing negative to name", () => {
    const base = makeDeal("adv-d");
    const deal = makeDeal("adv-d", {
      outbound: { ...base.outbound, stops: 0 },
      inbound: { ...base.inbound, stops: 0 },
      freeCancellation: true,
      board: "all-inclusive",
    });
    const f: AgentFilters = { ...NO_FILTERS, board: "all-inclusive" };
    expect(compromiseFor(deal, f)).toBeNull();
  });
});

describe("alternativesWithin — always scoped to the given pool", () => {
  it("finds a cheaper and a better option only among the provided pool", () => {
    const base = makeDeal("alt-target");
    const cheap = makeDeal("alt-cheap", { price: { ...base.price, perPerson: 2000 } });
    const target = makeDeal("alt-target", {
      price: { ...base.price, perPerson: 4000 },
      hotel: { ...base.hotel, stars: 3, guestRating: 7 },
    });
    const great = makeDeal("alt-great", { hotel: { ...base.hotel, stars: 5, guestRating: 9.5 } });

    const pool = [{ deal: cheap }, { deal: target }, { deal: great }];
    const result = alternativesWithin(target, pool);

    expect(result.cheaperAlternativeDealId).toBe(cheap.id);
    expect(result.betterAlternativeDealId).toBe(great.id);
    // Both referenced ids must be present in the pool that was passed in.
    const poolIds = pool.map((p) => p.deal.id);
    expect(poolIds).toContain(result.cheaperAlternativeDealId);
    expect(poolIds).toContain(result.betterAlternativeDealId);
  });

  it("returns null alternatives when the target is already the cheapest and best in the pool", () => {
    const base = makeDeal("alt-best");
    const worse = makeDeal("alt-worse", {
      price: { ...base.price, perPerson: 9000 },
      hotel: { ...base.hotel, stars: 2, guestRating: 5 },
    });
    const best = makeDeal("alt-best", {
      price: { ...base.price, perPerson: 1000 },
      hotel: { ...base.hotel, stars: 5, guestRating: 10 },
    });
    const result = alternativesWithin(best, [{ deal: worse }, { deal: best }]);
    expect(result.cheaperAlternativeDealId).toBeNull();
    expect(result.betterAlternativeDealId).toBeNull();
  });

  it("never references a deal outside the pool, even if a cheaper one exists elsewhere", () => {
    const base = makeDeal("alt-solo");
    const target = makeDeal("alt-solo", { price: { ...base.price, perPerson: 5000 } });
    // Pool contains only the target itself — no siblings.
    const result = alternativesWithin(target, [{ deal: target }]);
    expect(result.cheaperAlternativeDealId).toBeNull();
    expect(result.betterAlternativeDealId).toBeNull();
  });
});

describe("diagnoseBlockingConstraint — only names a constraint it actually proved", () => {
  it("names directOnly when relaxing it alone would produce a match", () => {
    const base = makeDeal("blocker-a");
    const connectingDeal = makeDeal("blocker-a", {
      outbound: { ...base.outbound, stops: 1 },
      inbound: { ...base.inbound, stops: 0 },
    });
    const f: AgentFilters = { ...NO_FILTERS, directOnly: true };
    const result = diagnoseBlockingConstraint([connectingDeal], f);
    expect(result?.field).toBe("directOnly");
  });

  it("returns null when no single relaxation would produce any match", () => {
    const base = makeDeal("blocker-b");
    const deal = makeDeal("blocker-b", {
      hotel: { ...base.hotel, stars: 2 },
      outbound: { ...base.outbound, stops: 1 },
      price: { ...base.price, perPerson: 20000 },
    });
    // Every one of these filters independently still excludes the deal —
    // relaxing any single one alone doesn't help.
    const f: AgentFilters = {
      ...NO_FILTERS,
      directOnly: true,
      minStars: 5,
      maxBudgetPerPerson: 1000,
    };
    const result = diagnoseBlockingConstraint([deal], f);
    expect(result).toBeNull();
  });

  it("does not name a field that was never set as the blocking constraint", () => {
    const base = makeDeal("blocker-c");
    const deal = makeDeal("blocker-c", { outbound: { ...base.outbound, stops: 1 } });
    // directOnly isn't set at all — it can't be "the" blocker.
    const f: AgentFilters = { ...NO_FILTERS, board: "all-inclusive" };
    const result = diagnoseBlockingConstraint([deal], f);
    if (result) expect(result.field).not.toBe("directOnly");
  });
});

describe("searchTrips (end-to-end) — alternatives and zero-result suggestions in the real pipeline", () => {
  it("every cheaperAlternativeDealId/betterAlternativeDealId is present in that same call's recommendations", async () => {
    vi.resetModules();
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [
        row({ slug: "e2e-a" }),
        row({ slug: "e2e-b" }),
        row({ slug: "e2e-c" }),
        row({ slug: "e2e-d" }),
      ],
    }));
    const mod = await import("@/lib/agent/agent-search.server");
    const result = await mod.searchTrips(NO_FILTERS, 8);

    const returnedIds = new Set(result.recommendations.map((r) => r.dealId));
    for (const r of result.recommendations) {
      if (r.cheaperAlternativeDealId)
        expect(returnedIds.has(r.cheaperAlternativeDealId)).toBe(true);
      if (r.betterAlternativeDealId) expect(returnedIds.has(r.betterAlternativeDealId)).toBe(true);
    }
    vi.doUnmock("@/lib/catalog.server");
  });

  it("a zero-result search only returns a blockingConstraint when relaxing it truly produces a match", async () => {
    vi.resetModules();
    vi.doMock("@/lib/catalog.server", () => ({
      fetchDestinationRows: async () => [row({ slug: "e2e-block" })],
    }));
    const mod = await import("@/lib/agent/agent-search.server");
    // minStars: 5 blocks everything (the demo hotel generation caps below
    // 5 often, but we force certainty by also requiring an absurd budget
    // that nothing can satisfy alongside a real, relaxable constraint).
    const result = await mod.searchTrips({ ...NO_FILTERS, directOnly: true, minStars: 99 }, 8);
    if (result.count === 0 && result.blockingConstraint) {
      // Whatever field was named, re-relaxing exactly that field on the
      // same filters must be provably capable of matching — re-verify here
      // independently rather than trusting the implementation blindly.
      const relaxed = { ...NO_FILTERS, directOnly: true, minStars: 99 } as AgentFilters;
      (relaxed as unknown as Record<string, unknown>)[result.blockingConstraint.field] = null;
      const catalog = [rowToDestination(row({ slug: "e2e-block" }))];
      const deals = listDeals(catalog, 3);
      expect(deals.some((d) => passesFilters(d, relaxed))).toBe(true);
    }
    vi.doUnmock("@/lib/catalog.server");
  });
});

describe("updateKnownPreferences tool schema (filtersSchema)", () => {
  it("accepts a fully populated object including the 4 new context-only fields", () => {
    const parsed = filtersSchema.safeParse({
      destinations: ["Santorini"],
      countries: null,
      tripType: "beach",
      style: "chill",
      maxBudgetPerPerson: 7000,
      nights: 5,
      people: 4,
      minStars: 4,
      board: "all-inclusive",
      directOnly: false,
      musts: ["beach"],
      exclude: null,
      requestedDates: "אוגוסט",
      dateFlexibility: "flexible",
      childrenAges: [4, 7],
      baggagePreference: "checked",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts all-null (nothing known yet)", () => {
    const parsed = filtersSchema.safeParse({
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
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid dateFlexibility value", () => {
    const parsed = filtersSchema.safeParse({
      ...NO_FILTERS,
      dateFlexibility: "whenever-i-feel-like-it",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid baggagePreference value", () => {
    const parsed = filtersSchema.safeParse({ ...NO_FILTERS, baggagePreference: "extra-large" });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-numeric childrenAges entries", () => {
    const parsed = filtersSchema.safeParse({ ...NO_FILTERS, childrenAges: ["four"] });
    expect(parsed.success).toBe(false);
  });
});
