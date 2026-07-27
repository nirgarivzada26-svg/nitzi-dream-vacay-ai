// In-memory cache of the last search's ranked results, so detail pages
// (/hotel/$id, /flight/$id, /package/$id) can render the same item the user
// clicked on without re-running provider search. Falls back to sessionStorage
// so a page reload still works.

import type { Flight, Hotel, Package } from "./providers/types";
import type { QuizAnswers } from "./nitzi-data";

type Scored<T> = T & { score: number };

interface Snapshot {
  answers: QuizAnswers;
  destinationName: string;
  hotels: Scored<Hotel>[];
  flights: Scored<Flight>[];
  packages: Scored<Package>[];
  savedAt: number;
}

let mem: Snapshot | null = null;
const KEY = "nitzi:results-cache";

export function setResultsCache(snap: Snapshot) {
  mem = snap;
  try { sessionStorage.setItem(KEY, JSON.stringify(snap)); } catch {}
}

export function getResultsCache(): Snapshot | null {
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    mem = JSON.parse(raw);
    return mem;
  } catch { return null; }
}

export function findHotel(id: string) {
  return getResultsCache()?.hotels.find((h) => h.id === id) ?? null;
}
export function findFlight(id: string) {
  return getResultsCache()?.flights.find((f) => f.id === id) ?? null;
}
export function findPackage(id: string) {
  return getResultsCache()?.packages.find((p) => p.id === id) ?? null;
}
