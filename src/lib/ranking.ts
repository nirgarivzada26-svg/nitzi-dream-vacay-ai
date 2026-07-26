// Ranks providers' raw results by fit with the user's answers.
// Each scorer returns a number 0..100; higher = better fit.

import type { Flight, Hotel, Package } from "./providers/types";
import type { QuizAnswers } from "./nitzi-data";

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export function scoreHotel(h: Hotel, a: QuizAnswers): number {
  const perNightBudget = (a.budget * 0.35) / Math.max(1, a.days);
  // Budget fit: perfect at ~90% of budget, drops off past 130%.
  const ratio = h.pricePerNight / Math.max(1, perNightBudget);
  const budgetScore = clamp(100 - Math.abs(ratio - 0.9) * 90);

  // Style fit
  let styleScore = 60;
  if (a.style === "luxury") styleScore = 40 + h.stars * 12;
  if (a.style === "smart") styleScore = 100 - Math.max(0, ratio - 0.8) * 80;
  if (a.style === "chill" && h.amenities.some((x) => ["spa", "pool", "adults-only"].includes(x))) styleScore = 85;
  if (a.style === "young" && h.amenities.some((x) => ["bar", "gym"].includes(x))) styleScore = 82;

  // Type fit
  let typeScore = 60;
  if (a.type === "family" && h.amenities.includes("family")) typeScore = 92;
  if (a.type === "romantic" && h.amenities.includes("adults-only")) typeScore = 92;
  if (a.type === "beach" && (h.distanceToBeachKm ?? 99) < 1) typeScore = 95;

  const guestScore = h.guestRating * 10;
  const qualityScore = h.stars * 20;
  const valueScore = clamp(100 - Math.max(0, ratio - 1) * 120);

  return Math.round(
    budgetScore * 0.28 +
    styleScore  * 0.16 +
    typeScore   * 0.14 +
    guestScore  * 0.18 +
    qualityScore * 0.10 +
    valueScore  * 0.14,
  );
}

export function scoreFlight(f: Flight, a: QuizAnswers, allPrices: number[]): number {
  const min = Math.min(...allPrices);
  const priceScore = clamp(100 - ((f.price - min) / Math.max(1, min)) * 120);
  const stopScore = f.stops === 0 ? 100 : f.stops === 1 ? 70 : 40;
  const durationHours = f.durationMinutes / 60;
  const idealHours = 4 + 1.5 * (a.days > 4 ? 1 : 0);
  const durationScore = clamp(100 - Math.max(0, durationHours - idealHours) * 6);
  const timeH = new Date(f.departAt).getHours();
  const timeScore = timeH >= 6 && timeH <= 22 ? 90 : 60;

  return Math.round(priceScore * 0.4 + stopScore * 0.25 + durationScore * 0.25 + timeScore * 0.1);
}

export function scorePackage(p: Package, a: QuizAnswers): number {
  const totalBudget = a.budget * a.people;
  const ratio = p.totalPrice / Math.max(1, totalBudget);
  const budgetScore = clamp(100 - Math.abs(ratio - 0.9) * 90);
  const savingsScore = clamp((p.savings / Math.max(1, p.separatePrice)) * 400);
  const ratingScore = p.rating * 10;
  return Math.round(budgetScore * 0.45 + ratingScore * 0.35 + savingsScore * 0.20);
}

export function rank<T>(items: T[], scorer: (x: T) => number): (T & { score: number })[] {
  return items
    .map((x) => ({ ...(x as object), score: scorer(x) } as T & { score: number }))
    .sort((a, b) => b.score - a.score);
}

// Convenience: flag budget adequacy of a hotel list.
export function budgetFit(h: Hotel, a: QuizAnswers) {
  const perNightBudget = (a.budget * 0.35) / Math.max(1, a.days);
  const ratio = h.pricePerNight / Math.max(1, perNightBudget);
  if (ratio <= 1) return "within" as const;
  if (ratio <= 1.25) return "slightly-over" as const;
  return "over" as const;
}
