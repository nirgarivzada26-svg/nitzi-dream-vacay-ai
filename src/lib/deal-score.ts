// NITZI Score — a single 0-100 number derived only from structured fields on
// the offer. No invented inputs: every contribution is listed in `factors` so
// the UI can explain exactly how the score was produced.

import type { Deal } from "./deals";

export interface ScoreFactor {
  label: string;
  points: number;
}

export interface NitziScore {
  value: number;
  factors: ScoreFactor[];
}

export function nitziScore(deal: Deal): NitziScore {
  const factors: ScoreFactor[] = [];

  factors.push({ label: "בסיס", points: 50 });

  const rating = deal.hotel.guestRating;
  factors.push({
    label: `דירוג אורחים ${rating.toFixed(1)}/10`,
    points: Math.round((rating - 7.5) * 6),
  });

  factors.push({ label: `מלון ${deal.hotel.stars}★`, points: (deal.hotel.stars - 3) * 4 });

  if (deal.outbound.stops === 0 && deal.inbound.stops === 0)
    factors.push({ label: "טיסה ישירה לשני הכיוונים", points: 10 });
  else if (deal.outbound.stops === 0) factors.push({ label: "הלוך ישיר", points: 5 });
  else factors.push({ label: "טיסה עם עצירות", points: -4 });

  if (deal.board === "all-inclusive") factors.push({ label: "הכל כלול", points: 6 });
  else if (deal.board === "half-board") factors.push({ label: "חצי פנסיון", points: 4 });
  else if (deal.board === "breakfast") factors.push({ label: "ארוחת בוקר", points: 2 });

  if (deal.freeCancellation) factors.push({ label: "ביטול חינם", points: 4 });

  if (deal.discountPct >= 10)
    factors.push({ label: `הנחה של ${deal.discountPct}% ממחיר המחירון`, points: 5 });

  const baseline = deal.destination.avgBudgetPerPerson;
  if (baseline > 0) {
    const delta = (deal.price.perPerson - baseline) / baseline;
    factors.push({
      label: delta < 0 ? "מתחת לממוצע היעד" : "מעל לממוצע היעד",
      points: Math.max(-8, Math.min(8, Math.round(-delta * 40))),
    });
  }

  const raw = factors.reduce((s, f) => s + f.points, 0);
  return { value: Math.max(1, Math.min(100, raw)), factors };
}
