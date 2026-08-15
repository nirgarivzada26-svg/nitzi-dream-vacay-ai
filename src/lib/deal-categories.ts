// Deal category rails for the home page.
// Each rail is a pure selector over the deals layer — no invented content here.
//
// Two layers of deduplication:
//  1. Within a rail: `groupDeals` — one canonical card per destination
//     (unchanged from before).
//  2. Across rails: a destination that already appeared as a card in an
//     earlier rail is deprioritized in later rails, so scrolling the
//     homepage doesn't show the same hotel/price card five times over.
//     Inventory is scarce (a handful of destinations currently have offers),
//     so absolute zero repetition isn't always possible — see
//     `pickForRail` for the controlled-backfill rules.

import { groupDeals, listDeals, type Deal, type DealGroup } from "./deals";
import type { Destination } from "./catalog";

export type DealRailId =
  | "nitzi"
  | "direct"
  | "value"
  | "couples"
  | "families"
  | "allinclusive"
  | "beach"
  | "hot"
  | "lastminute"
  | "luxury"
  | "europe"
  | "usa";

/** Filters forwarded to /packages so "לכל החבילות" lands on the same slice. */
export interface RailFilters {
  country?: string;
  region?: string;
  board?: "all-inclusive";
  stars?: number;
  beach?: boolean;
  direct?: boolean;
  sort?: "price" | "value" | "discount" | "soon";
}

export interface DealRail {
  id: DealRailId;
  title: string;
  subtitle: string;
  emoji: string;
  groups: DealGroup[];
  filters: RailFilters;
}

const daysUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / 86400000;
const valueScore = (d: Deal) => d.hotel.guestRating * 100 - d.price.perPerson / 50;

const MAX_PER_RAIL = 8;
const MIN_TARGET_PER_RAIL = 3;
/** A destination may anchor at most this many rails before it's only used as a last resort. */
const MAX_REPEATS = 2;

/**
 * Selects which destination-groups appear in one rail, given how many times
 * each destination has already anchored an earlier rail on this page.
 *
 * 1. Prefer destinations never used in a previous rail (in the rail's own
 *    relevance order — price/value/discount ranking is preserved).
 * 2. If that leaves fewer than MIN_TARGET_PER_RAIL groups, backfill from the
 *    remaining candidates, always taking the least-used ones first (so a
 *    destination only gets reused a 3rd+ time when literally nothing else
 *    in this rail's own candidate pool qualifies).
 * 3. Within a tier of equally-used candidates, prefer one whose country
 *    isn't already represented in this rail's selection yet.
 * 4. `excludeSlug` (used for the secret-deal destination on the first rail)
 *    is skipped entirely unless backfill still can't reach the minimum,
 *    in which case it's allowed back in as the last resort.
 */
function pickForRail(
  candidateGroups: DealGroup[],
  usage: Map<string, number>,
  excludeSlug?: string | string[],
): DealGroup[] {
  const excludeSet = excludeSlug
    ? new Set(Array.isArray(excludeSlug) ? excludeSlug : [excludeSlug])
    : null;
  const pool = excludeSet ? candidateGroups.filter((g) => !excludeSet.has(g.key)) : candidateGroups;

  const selected: DealGroup[] = [];
  const usedCountries = new Set<string>();

  for (const g of pool) {
    if (selected.length >= MAX_PER_RAIL) break;
    if ((usage.get(g.key) ?? 0) > 0) continue;
    selected.push(g);
    usedCountries.add(g.main.destination.country);
  }

  if (selected.length < Math.min(MIN_TARGET_PER_RAIL, pool.length)) {
    const selectedKeys = new Set(selected.map((g) => g.key));
    let remaining = pool.filter((g) => !selectedKeys.has(g.key));

    while (
      selected.length < MIN_TARGET_PER_RAIL &&
      selected.length < MAX_PER_RAIL &&
      remaining.length > 0
    ) {
      // Prefer candidates still under the repeat cap; only reach into
      // over-cap candidates when literally nothing else is left.
      const underCap = remaining.filter((g) => (usage.get(g.key) ?? 0) < MAX_REPEATS);
      const workingSet = underCap.length > 0 ? underCap : remaining;

      const minUsage = Math.min(...workingSet.map((g) => usage.get(g.key) ?? 0));
      const leastUsedTier = workingSet.filter((g) => (usage.get(g.key) ?? 0) === minUsage);
      const diversePick = leastUsedTier.find((g) => !usedCountries.has(g.main.destination.country));
      const chosen = diversePick ?? leastUsedTier[0];

      selected.push(chosen);
      usedCountries.add(chosen.main.destination.country);
      remaining = remaining.filter((g) => g.key !== chosen.key);
    }
  }

  // Last resort: even the excluded (secret-deal) destination is allowed
  // back in if nothing else was available to reach the minimum.
  if (selected.length < Math.min(MIN_TARGET_PER_RAIL, candidateGroups.length) && excludeSlug) {
    const excluded = candidateGroups.find((g) => g.key === excludeSlug);
    if (excluded && !selected.some((g) => g.key === excluded.key)) {
      selected.push(excluded);
    }
  }

  return selected;
}

interface RailDefinition {
  id: DealRailId;
  title: string;
  subtitle: string;
  emoji: string;
  filters: RailFilters;
  candidates: Deal[];
}

/**
 * Builds the home page's deal rails with cross-rail deduplication.
 *
 * @param catalog Managed destination catalog.
 * @param opts.excludeFromFirstRail Destination slug(s) (e.g. the currently
 *   rotating Secret Deal and/or Must-Not-Miss selection) to keep out of the
 *   first rail's primary selection, so a card a visitor just saw at the top
 *   of the page doesn't immediately repeat one scroll down. Falls back to
 *   including it if the first rail can't otherwise reach its minimum card
 *   count.
 */
export function buildDealRails(
  catalog: Destination[],
  opts?: { excludeFromFirstRail?: string | string[] },
): DealRail[] {
  const all = listDeals(catalog, 3);

  const byValue = [...all].sort((a, b) => valueScore(b) - valueScore(a));
  const byDiscount = [...all].sort((a, b) => b.discountPct - a.discountPct);
  const byPrice = [...all].sort((a, b) => a.price.perPerson - b.price.perPerson);

  // Priority order matters: earlier rails get first pick of scarce inventory.
  const railDefs: RailDefinition[] = [
    {
      id: "nitzi",
      title: "הדילים הנבחרים של NITZI",
      subtitle: "יחס מחיר-תמורה הכי טוב שמצאנו בקטלוג",
      emoji: "🧠",
      filters: { sort: "value" },
      candidates: byValue,
    },
    {
      id: "direct",
      title: "טיסות ישירות",
      subtitle: "בלי קונקשנים, בלי לבזבז יום",
      emoji: "🛫",
      filters: { direct: true },
      candidates: byValue.filter((d) => d.outbound.stops === 0 && d.inbound.stops === 0),
    },
    {
      id: "value",
      title: "התמורה הטובה ביותר",
      subtitle: "המחירים הנמוכים ביותר לאדם כרגע",
      emoji: "💰",
      filters: { sort: "price" },
      candidates: byPrice,
    },
    {
      id: "couples",
      title: "חופשות זוגיות",
      subtitle: "שקיעות, שקט ורומנטיקה",
      emoji: "💞",
      filters: { sort: "value" },
      candidates: byValue.filter((d) => d.destination.matches.includes("romantic")),
    },
    {
      id: "families",
      title: "חופשות משפחתיות",
      subtitle: "כיף לכל הגילאים, בלי כאב ראש",
      emoji: "👨‍👩‍👧",
      filters: { sort: "value" },
      candidates: byValue.filter((d) => d.destination.matches.includes("family")),
    },
    {
      id: "allinclusive",
      title: "הכל כלול",
      subtitle: "מגיעים, ולא מוציאים עוד שקל",
      emoji: "🍹",
      filters: { board: "all-inclusive" },
      candidates: byValue.filter((d) => d.board === "all-inclusive"),
    },
    {
      id: "beach",
      title: "מלונות ליד הים",
      subtitle: "יעדי חוף עם ים במרחק הליכה",
      emoji: "🌊",
      filters: { beach: true },
      candidates: byValue.filter((d) => d.destination.matches.includes("beach")),
    },
    {
      id: "hot",
      title: "דילים חמים",
      subtitle: "ההנחות הגדולות ביותר שנמצאו כרגע",
      emoji: "🔥",
      filters: { sort: "discount" },
      candidates: byDiscount,
    },
    {
      id: "lastminute",
      title: "הרגע האחרון",
      subtitle: "יציאה בשבועות הקרובים",
      emoji: "⏳",
      filters: { sort: "soon" },
      candidates: [...all]
        .filter((d) => daysUntil(d.dates.start) <= 24)
        .sort((a, b) => +new Date(a.dates.start) - +new Date(b.dates.start)),
    },
    {
      id: "luxury",
      title: "יוקרה",
      subtitle: "5 כוכבים, ספא ונוף שאי אפשר לשכוח",
      emoji: "✨",
      filters: { stars: 5 },
      candidates: all
        .filter((d) => d.hotel.stars >= 5)
        .sort((a, b) => b.price.perPerson - a.price.perPerson),
    },
    {
      id: "europe",
      title: "אירופה",
      subtitle: "קרוב, קליל ומלא ערים",
      emoji: "🇪🇺",
      filters: { region: "אירופה" },
      candidates: byValue.filter((d) => d.destination.region === "אירופה"),
    },
    {
      id: "usa",
      title: "ארצות הברית",
      subtitle: "ערים גדולות וחופים אינסופיים",
      emoji: "🇺🇸",
      filters: { region: "צפון אמריקה" },
      candidates: byValue.filter((d) => d.destination.region === "צפון אמריקה"),
    },
  ];

  const usage = new Map<string, number>();
  const rails: DealRail[] = [];

  railDefs.forEach((def, index) => {
    const candidateGroups = groupDeals(def.candidates);
    const isFirstRail = index === 0;
    const selected = pickForRail(
      candidateGroups,
      usage,
      isFirstRail ? opts?.excludeFromFirstRail : undefined,
    );

    if (selected.length === 0) return; // nothing matched at all — hide the rail

    // A single leftover card that's already been shown elsewhere reads as
    // artificial padding, not a real section — hide the rail instead.
    const isLoneRepeat = selected.length === 1 && (usage.get(selected[0].key) ?? 0) > 0;
    if (isLoneRepeat) return;

    for (const g of selected) usage.set(g.key, (usage.get(g.key) ?? 0) + 1);

    rails.push({
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      emoji: def.emoji,
      filters: def.filters,
      groups: selected,
    });
  });

  return rails;
}
