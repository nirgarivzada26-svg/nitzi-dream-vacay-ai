// Slice 3.6 — "if you liked X, you may also like…" destination similarity.
// Similarity is computed from catalog columns only (region, subregion,
// categories, budget, flight hours, season overlap). Destinations without
// offers are excluded so every suggestion is actually bookable.

import type { Destination } from "../catalog";

export interface AlternativeDestination {
  destination: Destination;
  score: number;
  reasons: string[];
}

function overlap(a: string[], b: string[]): number {
  const set = new Set(b);
  return a.filter((x) => set.has(x)).length;
}

export function alternativeDestinations(
  dest: Destination,
  catalog: Destination[],
  limit = 4,
): AlternativeDestination[] {
  const out: AlternativeDestination[] = [];

  for (const c of catalog) {
    if (c.slug === dest.slug || !c.hasOffers) continue;
    const reasons: string[] = [];
    let score = 0;

    const cats = overlap(dest.travelCategories, c.travelCategories);
    if (cats > 0) {
      score += cats * 22;
      reasons.push(`אותם סיווגי חופשה (${cats})`);
    }
    if (c.subregion && c.subregion === dest.subregion) {
      score += 18;
      reasons.push(`אותו אזור: ${c.subregion}`);
    } else if (c.region === dest.region) {
      score += 10;
      reasons.push(`אותו אזור גיאוגרפי: ${c.region}`);
    }
    if (dest.avgBudgetPerPerson > 0 && c.avgBudgetPerPerson > 0) {
      const gap = Math.abs(c.avgBudgetPerPerson - dest.avgBudgetPerPerson) / dest.avgBudgetPerPerson;
      if (gap <= 0.25) {
        score += 14;
        reasons.push("תקציב ממוצע דומה");
      }
    }
    if (Math.abs(c.flightHours - dest.flightHours) <= 1.5) {
      score += 10;
      reasons.push("משך טיסה דומה");
    }
    if (c.directFlightFromTLV) {
      score += 6;
      reasons.push("טיסה ישירה מתל אביב");
    }
    const months = overlap(
      dest.bestTravelMonths.map(String),
      c.bestTravelMonths.map(String),
    );
    if (months >= 3) {
      score += 8;
      reasons.push("עונת נסיעה חופפת");
    }

    if (score >= 30 && reasons.length >= 2) out.push({ destination: c, score, reasons });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
