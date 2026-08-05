// "האם זה זמן טוב להזמין?" — returned only when structured data supports a
// verdict. With too few comparable observations we return null and the UI says
// so explicitly instead of guessing.

import type { Deal } from "./deals";

export type BookTimingLevel = "good" | "average" | "wait";

export interface BookTiming {
  level: BookTimingLevel;
  label: string;
  detail: string;
  basis: string;
}

const MIN_OBSERVATIONS = 3;

export function bookTiming(deal: Deal, peers: Deal[]): BookTiming | null {
  const prices = peers.filter((p) => p.id !== deal.id).map((p) => p.price.perPerson);
  if (prices.length < MIN_OBSERVATIONS) return null;

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  if (avg <= 0) return null;

  const deltaPct = Math.round(((deal.price.perPerson - avg) / avg) * 100);
  const basis = `מבוסס על ${prices.length} הצעות מקבילות באותו יעד, ממוצע ₪${Math.round(avg).toLocaleString("he-IL")} לאדם.`;

  if (deltaPct <= -8)
    return {
      level: "good",
      label: "זמן טוב להזמין",
      detail: `המחיר נמוך ב-${Math.abs(deltaPct)}% מהצעות מקבילות ליעד.`,
      basis,
    };
  if (deltaPct >= 10)
    return {
      level: "wait",
      label: "כדאי להמתין",
      detail: `המחיר גבוה ב-${deltaPct}% מהצעות מקבילות ליעד. אפשר להפעיל התראת מחיר.`,
      basis,
    };
  return {
    level: "average",
    label: "מחיר ממוצע",
    detail: "המחיר תואם את ההצעות המקבילות ליעד — אין יתרון או חיסרון מובהק בתזמון.",
    basis,
  };
}
