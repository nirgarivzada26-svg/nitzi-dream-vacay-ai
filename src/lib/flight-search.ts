// Flight-only search. Uses the same modular provider layer as the packages
// flow (src/lib/providers/registry.ts) so swapping in a real supplier
// (Amadeus / Skyscanner) requires no UI change.

import { getProviders } from "./providers/registry";
import { scoreFlight } from "./ranking";
import { setResultsCache } from "./results-cache";
import type { Destination } from "./catalog";
import type { Flight } from "./providers/types";
import { defaultAnswers, type QuizAnswers } from "./nitzi-data";

export interface FlightQuery {
  origin: string;
  destination: Destination;
  departDate: string;
  returnDate: string;
  people: number;
}

export type ScoredFlight = Flight & { score: number };

export async function searchFlights(q: FlightQuery): Promise<ScoredFlight[]> {
  const answers: QuizAnswers = {
    ...defaultAnswers,
    destination: q.destination.slug,
    people: q.people,
    days: nightsBetween(q.departDate, q.returnDate) || defaultAnswers.days,
  };

  const { flights } = getProviders();
  const raw = await flights.search(
    {
      answers,
      destination: q.destination,
      origin: q.origin,
      startDate: q.departDate || undefined,
      endDate: q.returnDate || undefined,
    },
    { limit: 8 },
  );

  if (raw.length === 0) return [];

  const prices = raw.map((f) => f.price);
  const scored = raw
    .map((f) => ({ ...f, score: scoreFlight(f, answers, prices) }))
    .sort((a, b) => b.score - a.score);

  // Detail pages (/flight/$id) read from this snapshot.
  setResultsCache({
    answers,
    destinationName: q.destination.name,
    hotels: [],
    flights: scored,
    packages: [],
    savedAt: Date.now(),
  });

  return scored;
}

export function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return diff > 0 ? Math.round(diff) : 0;
}
