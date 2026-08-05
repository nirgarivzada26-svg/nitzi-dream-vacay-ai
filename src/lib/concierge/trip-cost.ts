// Slice 3.6 — estimated total trip cost.
//
// Package components come from the verified price breakdown. On-ground spend is
// derived from the catalog column `avg_budget_per_person` (the only structured
// on-ground figure we hold) — and because the catalog does NOT break that
// figure into food/transport/activities/shopping, those lines are returned as
// unavailable rather than split with invented weights.

import type { Deal } from "../deals";
import { breakdownFor, fmtCents } from "../deal-pricing";

export const NOT_ENOUGH_DATA = "אין מספיק נתונים מאומתים.";

export interface CostLine {
  key: string;
  label: string;
  cents: number | null;
  source: string;
}

export interface TripCost {
  travelers: number;
  lines: CostLine[];
  packageCents: number;
  groundCents: number | null;
  totalCents: number | null;
  /** Categories the catalog cannot back. */
  missing: string[];
  format: (c: number) => string;
}

export function tripCost(deal: Deal, totalCentsOverride?: number): TripCost {
  const b = breakdownFor(deal, totalCentsOverride);
  const travelers = b.travelers;
  const nights = Math.max(1, deal.dates.nights);
  const dest = deal.destination;

  // Package price already covers flights + hotel; the catalog average budget is
  // a full-trip per-person figure, so the on-ground allowance is what remains.
  const avgTotalCents = dest.avgBudgetPerPerson > 0 ? dest.avgBudgetPerPerson * 100 * travelers : null;
  const groundCents =
    avgTotalCents !== null ? Math.max(0, avgTotalCents - b.totalCents) : null;

  const lines: CostLine[] = [
    {
      key: "flights",
      label: "טיסות",
      cents: b.flightsCents,
      source: "מחיר מאומת מספק הטיסות",
    },
    { key: "hotel", label: "מלון", cents: b.hotelCents, source: "מחיר מאומת מספק הלינה" },
    { key: "taxes", label: "מסים והיטלים", cents: b.taxesCents, source: "פירוט המחיר בהצעה" },
    { key: "fees", label: "עמלת שירות NITZI", cents: b.feesCents, source: "תעריף השירות של NITZI" },
    {
      key: "ground",
      label: `הוצאות ביעד (${nights} לילות)`,
      cents: groundCents,
      source:
        groundCents === null
          ? NOT_ENOUGH_DATA
          : "עמודת avg_budget_per_person בקטלוג היעדים, בניכוי מחיר החבילה",
    },
    { key: "food", label: "אוכל", cents: null, source: NOT_ENOUGH_DATA },
    { key: "transport", label: "תחבורה ביעד", cents: null, source: NOT_ENOUGH_DATA },
    { key: "activities", label: "אטרקציות", cents: null, source: NOT_ENOUGH_DATA },
    { key: "shopping", label: "קניות", cents: null, source: NOT_ENOUGH_DATA },
  ];

  return {
    travelers,
    lines,
    packageCents: b.totalCents,
    groundCents,
    totalCents: groundCents === null ? b.totalCents : b.totalCents + groundCents,
    missing: lines.filter((l) => l.cents === null).map((l) => l.label),
    format: fmtCents,
  };
}
