// Deal category rails for the home page.
// Each rail is a pure selector over the deals layer — no invented content here.
// Rails are deduped by destination and grouped: one canonical card per
// destination, with the remaining canonical offers exposed as variations.

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

const MAX_PER_SECTION = 8;

/** Groups by destination and caps the section, so no destination repeats. */
function section(deals: Deal[]): DealGroup[] {
  return groupDeals(deals).slice(0, MAX_PER_SECTION);
}

const valueScore = (d: Deal) => d.hotel.guestRating * 100 - d.price.perPerson / 50;

export function buildDealRails(catalog: Destination[]): DealRail[] {
  const all = listDeals(catalog, 3);

  const byValue = [...all].sort((a, b) => valueScore(b) - valueScore(a));
  const byDiscount = [...all].sort((a, b) => b.discountPct - a.discountPct);
  const byPrice = [...all].sort((a, b) => a.price.perPerson - b.price.perPerson);

  const rails: DealRail[] = [
    {
      id: "nitzi",
      title: "הדילים הנבחרים של NITZI",
      subtitle: "יחס מחיר-תמורה הכי טוב שמצאנו בקטלוג",
      emoji: "🧠",
      groups: section(byValue),
      filters: { sort: "value" },
    },
    {
      id: "direct",
      title: "טיסות ישירות",
      subtitle: "בלי קונקשנים, בלי לבזבז יום",
      emoji: "🛫",
      groups: section(
        byValue.filter((d) => d.outbound.stops === 0 && d.inbound.stops === 0),
      ),
      filters: { direct: true },
    },
    {
      id: "value",
      title: "התמורה הטובה ביותר",
      subtitle: "המחירים הנמוכים ביותר לאדם כרגע",
      emoji: "💰",
      groups: section(byPrice),
      filters: { sort: "price" },
    },
    {
      id: "couples",
      title: "חופשות זוגיות",
      subtitle: "שקיעות, שקט ורומנטיקה",
      emoji: "💞",
      groups: section(byValue.filter((d) => d.destination.matches.includes("romantic"))),
      filters: { sort: "value" },
    },
    {
      id: "families",
      title: "חופשות משפחתיות",
      subtitle: "כיף לכל הגילאים, בלי כאב ראש",
      emoji: "👨‍👩‍👧",
      groups: section(byValue.filter((d) => d.destination.matches.includes("family"))),
      filters: { sort: "value" },
    },
    {
      id: "allinclusive",
      title: "הכל כלול",
      subtitle: "מגיעים, ולא מוציאים עוד שקל",
      emoji: "🍹",
      groups: section(byValue.filter((d) => d.board === "all-inclusive")),
      filters: { board: "all-inclusive" },
    },
    {
      id: "beach",
      title: "מלונות ליד הים",
      subtitle: "יעדי חוף עם ים במרחק הליכה",
      emoji: "🌊",
      groups: section(byValue.filter((d) => d.destination.matches.includes("beach"))),
      filters: { beach: true },
    },
    {
      id: "hot",
      title: "דילים חמים",
      subtitle: "ההנחות הגדולות ביותר שנמצאו כרגע",
      emoji: "🔥",
      groups: section(byDiscount),
      filters: { sort: "discount" },
    },
    {
      id: "lastminute",
      title: "הרגע האחרון",
      subtitle: "יציאה בשבועות הקרובים",
      emoji: "⏳",
      groups: section(
        [...all]
          .filter((d) => daysUntil(d.dates.start) <= 24)
          .sort((a, b) => +new Date(a.dates.start) - +new Date(b.dates.start)),
      ),
      filters: { sort: "soon" },
    },
    {
      id: "luxury",
      title: "יוקרה",
      subtitle: "5 כוכבים, ספא ונוף שאי אפשר לשכוח",
      emoji: "✨",
      groups: section(
        all
          .filter((d) => d.hotel.stars >= 5)
          .sort((a, b) => b.price.perPerson - a.price.perPerson),
      ),
      filters: { stars: 5 },
    },
    {
      id: "europe",
      title: "אירופה",
      subtitle: "קרוב, קליל ומלא ערים",
      emoji: "🇪🇺",
      groups: section(byValue.filter((d) => d.destination.region === "אירופה")),
      filters: { region: "אירופה" },
    },
    {
      id: "usa",
      title: "ארצות הברית",
      subtitle: "ערים גדולות וחופים אינסופיים",
      emoji: "🇺🇸",
      groups: section(byValue.filter((d) => d.destination.region === "צפון אמריקה")),
      filters: { region: "צפון אמריקה" },
    },
  ];

  // A rail with nothing behind it is noise — drop it rather than show a stub.
  return rails.filter((r) => r.groups.length > 0);
}
