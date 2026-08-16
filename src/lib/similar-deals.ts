// Related offers for a deal page: max 6 cards, max 2 per destination, never the
// deal itself and never the same canonical id twice.

import type { Destination } from "./catalog";
import { listDeals, type Deal } from "./deals";

export type SimilarReason =
  | "same-destination"
  | "similar-budget"
  | "better-hotel"
  | "cheaper-flight"
  | "direct-flight"
  | "nearby-destination";

export const SIMILAR_LABEL: Record<SimilarReason, string> = {
  "same-destination": "אותו יעד",
  "similar-budget": "תקציב דומה",
  "better-hotel": "מלון טוב יותר",
  "cheaper-flight": "טיסה זולה יותר",
  "direct-flight": "טיסה ישירה",
  "nearby-destination": "יעד סמוך",
};

export interface SimilarDeal {
  deal: Deal;
  reason: SimilarReason;
}

export function similarDeals(deal: Deal, catalog: Destination[], limit = 6): SimilarDeal[] {
  const all = listDeals(catalog, 2).filter((d) => d.id !== deal.id);
  const perDest = new Map<string, number>();
  const seen = new Set<string>();
  const out: SimilarDeal[] = [];

  const push = (d: Deal, reason: SimilarReason) => {
    if (out.length >= limit || seen.has(d.id)) return;
    const slug = d.destination.slug;
    if ((perDest.get(slug) ?? 0) >= 2) return;
    perDest.set(slug, (perDest.get(slug) ?? 0) + 1);
    seen.add(d.id);
    out.push({ deal: d, reason });
  };

  const budget = deal.price.perPerson;

  for (const d of all.filter((d) => d.destination.slug === deal.destination.slug))
    push(d, "same-destination");
  for (const d of all.filter(
    (d) => d.hotel.stars > deal.hotel.stars || d.hotel.guestRating > deal.hotel.guestRating + 0.3,
  ))
    push(d, "better-hotel");
  for (const d of all.filter((d) => d.outbound.stops === 0 && deal.outbound.stops > 0))
    push(d, "direct-flight");
  for (const d of all.filter((d) => d.price.perPerson < budget * 0.92)) push(d, "cheaper-flight");
  for (const d of all.filter((d) => d.destination.region === deal.destination.region))
    push(d, "nearby-destination");
  for (const d of all.filter(
    (d) => Math.abs(d.price.perPerson - budget) / Math.max(1, budget) <= 0.15,
  ))
    push(d, "similar-budget");

  return out.slice(0, limit);
}
