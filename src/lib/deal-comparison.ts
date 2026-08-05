// Side-by-side comparison of a deal against catalog-backed alternatives, plus
// the plain-Hebrew "what you get for the extra money" sentence.

import type { Deal } from "./deals";
import { boardLabels } from "./deals";

export type CompareAngle =
  | "better-hotel"
  | "cheaper"
  | "direct-flight"
  | "better-times"
  | "better-location";

export const ANGLE_LABEL: Record<CompareAngle, string> = {
  "better-hotel": "מלון טוב יותר",
  cheaper: "חבילה זולה יותר",
  "direct-flight": "טיסה ישירה",
  "better-times": "שעות טיסה נוחות יותר",
  "better-location": "מיקום עדיף",
};

export interface CompareRow {
  label: string;
  base: string;
  other: string;
  advantage: "base" | "other" | "equal";
}

export interface Comparison {
  angle: CompareAngle;
  deal: Deal;
  rows: CompareRow[];
  priceDeltaPerPerson: number;
  /** Data-backed sentence, e.g. "בתוספת של ₪240 מקבלים מלון 5★ במקום 4★". */
  verdict: string;
}

const ils = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
const daytime = (iso: string) => {
  const h = new Date(iso).getUTCHours();
  return h >= 7 && h <= 20;
};

function rowsFor(base: Deal, other: Deal): CompareRow[] {
  const rows: CompareRow[] = [
    {
      label: "מחיר לאדם",
      base: ils(base.price.perPerson),
      other: ils(other.price.perPerson),
      advantage:
        other.price.perPerson === base.price.perPerson
          ? "equal"
          : other.price.perPerson < base.price.perPerson
            ? "other"
            : "base",
    },
    {
      label: "מלון",
      base: `${base.hotel.name} · ${base.hotel.stars}★`,
      other: `${other.hotel.name} · ${other.hotel.stars}★`,
      advantage:
        other.hotel.stars === base.hotel.stars
          ? "equal"
          : other.hotel.stars > base.hotel.stars
            ? "other"
            : "base",
    },
    {
      label: "דירוג אורחים",
      base: `${base.hotel.guestRating.toFixed(1)}/10`,
      other: `${other.hotel.guestRating.toFixed(1)}/10`,
      advantage:
        Math.abs(other.hotel.guestRating - base.hotel.guestRating) < 0.1
          ? "equal"
          : other.hotel.guestRating > base.hotel.guestRating
            ? "other"
            : "base",
    },
    {
      label: "בסיס אירוח",
      base: boardLabels[base.board],
      other: boardLabels[other.board],
      advantage: base.board === other.board ? "equal" : "other",
    },
    {
      label: "עצירות",
      base: base.outbound.stops === 0 ? "ישירה" : `${base.outbound.stops} עצירות`,
      other: other.outbound.stops === 0 ? "ישירה" : `${other.outbound.stops} עצירות`,
      advantage:
        other.outbound.stops === base.outbound.stops
          ? "equal"
          : other.outbound.stops < base.outbound.stops
            ? "other"
            : "base",
    },
    {
      label: "שעות טיסה",
      base: `${hhmm(base.outbound.departAt)} → חזרה ${hhmm(base.inbound.arriveAt)}`,
      other: `${hhmm(other.outbound.departAt)} → חזרה ${hhmm(other.inbound.arriveAt)}`,
      advantage:
        daytime(other.outbound.departAt) === daytime(base.outbound.departAt)
          ? "equal"
          : daytime(other.outbound.departAt)
            ? "other"
            : "base",
    },
    {
      label: "מיקום",
      base: `${base.destination.name}${base.destination.subregion ? ` · ${base.destination.subregion}` : ""}`,
      other: `${other.destination.name}${other.destination.subregion ? ` · ${other.destination.subregion}` : ""}`,
      advantage: "equal",
    },
    {
      label: "ביטול",
      base: base.freeCancellation ? "ביטול חינם" : "ללא ביטול חינם",
      other: other.freeCancellation ? "ביטול חינם" : "ללא ביטול חינם",
      advantage:
        base.freeCancellation === other.freeCancellation
          ? "equal"
          : other.freeCancellation
            ? "other"
            : "base",
    },
  ];
  return rows;
}

function verdictFor(base: Deal, other: Deal): string {
  const delta = other.price.perPerson - base.price.perPerson;
  const gains: string[] = [];
  if (other.hotel.stars > base.hotel.stars)
    gains.push(`מלון ${other.hotel.stars}★ במקום ${base.hotel.stars}★`);
  if (other.hotel.guestRating > base.hotel.guestRating + 0.2)
    gains.push(`דירוג אורחים ${other.hotel.guestRating.toFixed(1)} במקום ${base.hotel.guestRating.toFixed(1)}`);
  if (other.outbound.stops < base.outbound.stops) gains.push("טיסה ישירה");
  if (other.board !== base.board) gains.push(boardLabels[other.board]);
  if (!base.freeCancellation && other.freeCancellation) gains.push("ביטול חינם");
  if (daytime(other.outbound.departAt) && !daytime(base.outbound.departAt))
    gains.push("שעת יציאה נוחה יותר");

  const losses: string[] = [];
  if (other.hotel.stars < base.hotel.stars)
    losses.push(`מלון ${other.hotel.stars}★ במקום ${base.hotel.stars}★`);
  if (other.outbound.stops > base.outbound.stops) losses.push("עצירה בדרך");
  if (base.freeCancellation && !other.freeCancellation) losses.push("ללא ביטול חינם");

  if (delta > 0) {
    return gains.length > 0
      ? `בתוספת של ${ils(delta)} לאדם מקבלים ${gains.join(", ")}.`
      : `החבילה הזו יקרה ב-${ils(delta)} לאדם ללא יתרון מדיד בנתונים שקיימים.`;
  }
  if (delta < 0) {
    const save = `חיסכון של ${ils(-delta)} לאדם`;
    if (losses.length > 0) return `${save}, אבל מקבלים ${losses.join(", ")}.`;
    return gains.length > 0 ? `${save} ובנוסף ${gains.join(", ")}.` : `${save} בתנאים דומים.`;
  }
  return gains.length > 0
    ? `באותו מחיר מקבלים ${gains.join(", ")}.`
    : "אותו מחיר ותנאים דומים בנתונים שקיימים.";
}

function pick(cands: Deal[], angle: CompareAngle, base: Deal): Deal | null {
  const s = [...cands];
  switch (angle) {
    case "better-hotel":
      return (
        s
          .filter((d) => d.hotel.stars > base.hotel.stars || d.hotel.guestRating > base.hotel.guestRating + 0.3)
          .sort((a, b) => b.hotel.guestRating - a.hotel.guestRating)[0] ?? null
      );
    case "cheaper":
      return (
        s
          .filter((d) => d.price.perPerson < base.price.perPerson)
          .sort((a, b) => a.price.perPerson - b.price.perPerson)[0] ?? null
      );
    case "direct-flight":
      return base.outbound.stops === 0
        ? null
        : (s.filter((d) => d.outbound.stops === 0 && d.inbound.stops === 0)[0] ?? null);
    case "better-times":
      return daytime(base.outbound.departAt)
        ? null
        : (s.filter((d) => daytime(d.outbound.departAt) && daytime(d.inbound.arriveAt))[0] ?? null);
    case "better-location":
      return (
        s.filter(
          (d) =>
            d.destination.slug !== base.destination.slug &&
            d.destination.region === base.destination.region &&
            d.destination.directFlightFromTLV &&
            !base.destination.directFlightFromTLV,
        )[0] ?? null
      );
  }
}

const ANGLES: CompareAngle[] = [
  "better-hotel",
  "cheaper",
  "direct-flight",
  "better-times",
  "better-location",
];

/** Only returns angles where a real catalog candidate exists. */
export function buildComparisons(base: Deal, candidates: Deal[]): Comparison[] {
  const pool = candidates.filter((d) => d.id !== base.id);
  const used = new Set<string>();
  const out: Comparison[] = [];

  for (const angle of ANGLES) {
    const other = pick(
      pool.filter((d) => !used.has(d.id)),
      angle,
      base,
    );
    if (!other) continue;
    used.add(other.id);
    out.push({
      angle,
      deal: other,
      rows: rowsFor(base, other),
      priceDeltaPerPerson: other.price.perPerson - base.price.perPerson,
      verdict: verdictFor(base, other),
    });
  }
  return out;
}
