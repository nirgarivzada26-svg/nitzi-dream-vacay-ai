import { describe, expect, it } from "vitest";
import { DESTINATIONS_FALLBACK } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { scoreBreakdown, NO_DATA } from "@/lib/deal-scores";
import { buildComparisons } from "@/lib/deal-comparison";
import { travelTips } from "@/lib/destination-tips";
import { bookTiming } from "@/lib/book-timing";

const catalog = DESTINATIONS_FALLBACK;
const deals = listDeals(catalog, 3);

describe("Slice 3.5 — travel intelligence is catalog-backed", () => {
  it("never scores a metric that has no backing field", () => {
    for (const deal of deals.slice(0, 20)) {
      const b = scoreBreakdown(deal, deals.filter((d) => d.destination.slug === deal.destination.slug));
      for (const g of b.groups)
        for (const m of g.metrics)
          if (m.value === null) expect(m.basis).toContain(NO_DATA);
      expect(b.coverage.scored).toBeLessThanOrEqual(b.coverage.total);
    }
  });

  it("only compares against real catalog deals, never the deal itself", () => {
    for (const deal of deals.slice(0, 10)) {
      const cmp = buildComparisons(deal, deals);
      const ids = cmp.map((c) => c.deal.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).not.toContain(deal.id);
    }
  });

  it("marks tip categories without data as unavailable instead of inventing text", () => {
    for (const dest of catalog.slice(0, 30))
      for (const c of travelTips(dest))
        if (!c.available) expect(c.items).toHaveLength(0);
  });

  it("returns no booking-timing verdict without enough observations", () => {
    expect(bookTiming(deals[0], [])).toBeNull();
  });
});
