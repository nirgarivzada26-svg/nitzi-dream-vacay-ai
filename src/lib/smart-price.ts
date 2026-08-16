// "מחיר חכם" — compares a deal's per-person price against the catalog
// distribution for that destination.
//
// The baseline is destinations.avg_budget_per_person from the DB, optionally
// refined by the per-person prices of comparable offers ("observations") that
// the caller passes in. Nothing is invented: with no baseline and no
// observations the verdict is "אין מספיק מידע".

import type { Deal } from "./deals";

export type SmartPriceLevel = "great" | "good" | "normal" | "expensive" | "unknown";

export interface SmartPriceBasis {
  destination: string;
  nights: number;
  stars: number;
  directPreferred: boolean;
  /** How many comparable offers backed the verdict (0 = catalog average only). */
  observations: number;
  baselinePerPerson: number | null;
}

export interface SmartPriceVerdict {
  level: SmartPriceLevel;
  /** negative = cheaper than the baseline */
  deltaPct: number;
  label: string;
  detail: string;
  emoji: string;
  /** tailwind classes for the chip */
  cls: string;
  basis: SmartPriceBasis;
}

const UNKNOWN_LABEL = "אין מספיק מידע";

export function smartPrice(
  deal: Deal,
  peerPricesPerPerson: number[] = [],
): SmartPriceVerdict | null {
  const peers = peerPricesPerPerson.filter((n) => Number.isFinite(n) && n > 0);
  const catalogAvg = deal.destination.avgBudgetPerPerson;
  const peerAvg = peers.length > 0 ? peers.reduce((a, b) => a + b, 0) / peers.length : null;
  const baseline = peerAvg ?? (catalogAvg > 0 ? catalogAvg : null);

  const basis: SmartPriceBasis = {
    destination: deal.destination.name,
    nights: deal.dates.nights,
    stars: deal.hotel.stars,
    directPreferred: deal.destination.directFlightFromTLV,
    observations: peers.length,
    baselinePerPerson: baseline,
  };

  if (!baseline) {
    return {
      level: "unknown",
      deltaPct: 0,
      emoji: "⚪",
      label: UNKNOWN_LABEL,
      detail: `אין מספיק הצעות להשוואה ל${deal.destination.name} בתאריכים אלה.`,
      cls: "bg-muted text-muted-foreground",
      basis,
    };
  }

  const deltaPct = Math.round(((deal.price.perPerson - baseline) / baseline) * 100);
  const against =
    peers.length > 0
      ? `${peers.length} הצעות דומות ל${deal.destination.name} (${deal.dates.nights} לילות, ${deal.hotel.stars}★)`
      : `המחיר הממוצע לאדם ל${deal.destination.name} בקטלוג NITZI`;

  if (deltaPct <= -12)
    return {
      level: "great",
      deltaPct,
      emoji: "🟢",
      label: "מצוין",
      detail: `זול ב-${Math.abs(deltaPct)}% מ${against}`,
      cls: "bg-emerald-100 text-emerald-800",
      basis,
    };
  if (deltaPct <= -4)
    return {
      level: "good",
      deltaPct,
      emoji: "🟢",
      label: "טוב",
      detail: `זול ב-${Math.abs(deltaPct)}% מ${against}`,
      cls: "bg-emerald-50 text-emerald-800",
      basis,
    };
  if (deltaPct >= 12)
    return {
      level: "expensive",
      deltaPct,
      emoji: "🔴",
      label: "יקר",
      detail: `יקר ב-${deltaPct}% מ${against}`,
      cls: "bg-rose-100 text-rose-800",
      basis,
    };
  return {
    level: "normal",
    deltaPct,
    emoji: "🟡",
    label: "רגיל",
    detail:
      deltaPct === 0
        ? `בדיוק לפי ${against}`
        : `${deltaPct < 0 ? `זול ב-${Math.abs(deltaPct)}%` : `יקר ב-${deltaPct}%`} מ${against}`,
    cls: "bg-amber-100 text-amber-900",
    basis,
  };
}
