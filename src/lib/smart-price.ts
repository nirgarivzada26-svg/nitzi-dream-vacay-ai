// "מחיר חכם" — compares a deal's per-person price against the destination's
// average market price (destinations.avg_budget_per_person in the DB) and
// returns a plain verdict the user can act on.
//
// No invented data: the baseline is the catalog average for that destination,
// and the deal price is whatever the provider returned. When a destination has
// no baseline we return null and the UI shows nothing.

import type { Deal } from "./deals";

export type SmartPriceLevel = "great" | "normal" | "wait";

export interface SmartPriceVerdict {
  level: SmartPriceLevel;
  /** negative = cheaper than average */
  deltaPct: number;
  label: string;
  detail: string;
  emoji: string;
  /** tailwind classes for the chip */
  cls: string;
}

export function smartPrice(deal: Deal): SmartPriceVerdict | null {
  const baseline = deal.destination.avgBudgetPerPerson;
  if (!baseline || baseline <= 0) return null;

  const deltaPct = Math.round(((deal.price.perPerson - baseline) / baseline) * 100);

  if (deltaPct <= -12) {
    return {
      level: "great",
      deltaPct,
      emoji: "🟢",
      label: "מחיר מצוין",
      detail: `זול ב-${Math.abs(deltaPct)}% מהמחיר הממוצע ל${deal.destination.name}`,
      cls: "bg-emerald-100 text-emerald-800",
    };
  }
  if (deltaPct >= 8) {
    return {
      level: "wait",
      deltaPct,
      emoji: "🔴",
      label: "כדאי להמתין",
      detail: `יקר ב-${deltaPct}% מהממוצע ל${deal.destination.name} — לרוב יש דילים זולים יותר`,
      cls: "bg-rose-100 text-rose-800",
    };
  }
  return {
    level: "normal",
    deltaPct,
    emoji: "🟡",
    label: "מחיר רגיל",
    detail:
      deltaPct === 0
        ? `בדיוק לפי הממוצע ל${deal.destination.name}`
        : `${deltaPct < 0 ? `זול ב-${Math.abs(deltaPct)}%` : `יקר ב-${deltaPct}%`} מהממוצע ל${deal.destination.name}`,
    cls: "bg-amber-100 text-amber-900",
  };
}
