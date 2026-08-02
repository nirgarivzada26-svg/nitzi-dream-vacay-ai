// Deal category rails for the home page.
// Each rail is a pure selector over the deals layer — no invented content here.
// When real suppliers are connected, `listDeals()` changes and the rails follow.

import { listDeals, type Deal } from "./deals";
import type { Destination } from "./catalog";

export type DealRailId =
  | "hot"
  | "lastminute"
  | "couples"
  | "families"
  | "allinclusive"
  | "luxury"
  | "nitzi";

export interface DealRail {
  id: DealRailId;
  title: string;
  subtitle: string;
  emoji: string;
  deals: Deal[];
}

const daysUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / 86400000;

/** One offer per destination, keeping the first (best-ranked) occurrence. */
const uniqueByDestination = (deals: Deal[]) => {
  const seen = new Set<string>();
  return deals.filter((d) =>
    seen.has(d.destination.slug) ? false : (seen.add(d.destination.slug), true),
  );
};

export function buildDealRails(catalog: Destination[]): DealRail[] {
  const all = listDeals(catalog, 3);

  const byDiscount = [...all].sort((a, b) => b.discountPct - a.discountPct);
  const byValue = [...all].sort(
    (a, b) =>
      b.hotel.guestRating * 100 - b.price.perPerson / 50 -
      (a.hotel.guestRating * 100 - a.price.perPerson / 50),
  );

  return [
    {
      id: "hot",
      title: "דילים חמים",
      subtitle: "ההנחות הגדולות ביותר שנמצאו כרגע",
      emoji: "🔥",
      deals: uniqueByDestination(byDiscount).slice(0, 10),
    },
    {
      id: "lastminute",
      title: "הרגע האחרון",
      subtitle: "יציאה בשבועות הקרובים",
      emoji: "⏳",
      deals: uniqueByDestination(
        [...all]
          .filter((d) => daysUntil(d.dates.start) <= 24)
          .sort((a, b) => +new Date(a.dates.start) - +new Date(b.dates.start)),
      ).slice(0, 10),
    },
    {
      id: "couples",
      title: "חופשות זוגיות",
      subtitle: "שקיעות, שקט ורומנטיקה",
      emoji: "💞",
      deals: uniqueByDestination(
        all.filter((d) => d.destination.matches.includes("romantic")),
      ).slice(0, 10),
    },
    {
      id: "families",
      title: "משפחות",
      subtitle: "כיף לכל הגילאים, בלי כאב ראש",
      emoji: "👨‍👩‍👧",
      deals: uniqueByDestination(
        all.filter((d) => d.destination.matches.includes("family")),
      ).slice(0, 10),
    },
    {
      id: "allinclusive",
      title: "הכל כלול",
      subtitle: "מגיעים, ולא מוציאים עוד שקל",
      emoji: "🍹",
      deals: uniqueByDestination(all.filter((d) => d.board === "all-inclusive")).slice(0, 10),
    },
    {
      id: "luxury",
      title: "יוקרה",
      subtitle: "5 כוכבים, ספא ונוף שאי אפשר לשכוח",
      emoji: "✨",
      deals: uniqueByDestination(
        all
          .filter((d) => d.hotel.stars >= 5 || d.price.perPerson >= 7000)
          .sort((a, b) => b.price.perPerson - a.price.perPerson),
      ).slice(0, 10),
    },
    {
      id: "nitzi",
      title: "ההמלצות של NITZI",
      subtitle: "יחס מחיר-תמורה הכי טוב שמצאנו",
      emoji: "🧠",
      deals: uniqueByDestination(byValue).slice(0, 10),
    },
  ];
}
