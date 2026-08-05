// Destination search + facets. Pure functions so they can be unit tested and
// reused by the selector, the AI agent and any filter UI. Never hardcodes
// destinations — it only reads the managed catalog.

import type { Destination } from "./catalog";
import { validDestinations, isFlightDestination } from "./destination-validation";

export type DestinationFacet =
  | "all"
  | "popular"
  | "trending"
  | "europe"
  | "usa"
  | "asia"
  | "islands"
  | "beach"
  | "city"
  | "direct";

export const DESTINATION_FACETS: { id: DestinationFacet; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "popular", label: "פופולריים" },
  { id: "trending", label: "חמים עכשיו" },
  { id: "direct", label: "טיסה ישירה" },
  { id: "europe", label: "אירופה" },
  { id: "usa", label: "ארה״ב" },
  { id: "asia", label: "אסיה" },
  { id: "islands", label: "איים" },
  { id: "beach", label: "חופים" },
  { id: "city", label: "עיר וקצר" },
];

const REGION_EUROPE = "אירופה";
const REGION_ASIA = "אסיה";

export function matchesFacet(d: Destination, facet: DestinationFacet): boolean {
  switch (facet) {
    case "all":
      return true;
    case "popular":
      return d.isPopular;
    case "trending":
      return d.isTrending;
    case "direct":
      return d.directFlightFromTLV;
    case "europe":
      return d.region === REGION_EUROPE;
    case "usa":
      return d.countryCode === "US";
    case "asia":
      return d.region === REGION_ASIA;
    case "islands":
      return d.travelCategories.includes("island");
    case "beach":
      return d.travelCategories.includes("beach");
    case "city":
      return d.travelCategories.includes("city");
    default:
      return true;
  }
}

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[״"'`׳]/g, "")
    .replace(/\s+/g, " ");

/** Score a destination against a free-text query (Hebrew or English). */
export function scoreDestination(d: Destination, rawQuery: string): number {
  const q = normalize(rawQuery);
  if (!q) return 0;

  const code = q.toUpperCase();
  if (d.airportCodes.includes(code)) return 120;

  const fields: { value: string; weight: number }[] = [
    { value: d.name, weight: 100 },
    { value: d.cityEn, weight: 100 },
    { value: d.country, weight: 70 },
    { value: d.countryEn, weight: 70 },
    { value: d.slug.replace(/-/g, " "), weight: 60 },
    { value: d.region, weight: 40 },
    { value: d.subregion, weight: 40 },
    { value: d.tagline, weight: 20 },
    { value: d.shortDescription, weight: 20 },
  ];

  let best = 0;
  for (const f of fields) {
    const v = normalize(f.value);
    if (!v) continue;
    if (v === q) best = Math.max(best, f.weight + 20);
    else if (v.startsWith(q)) best = Math.max(best, f.weight + 10);
    else if (v.includes(q)) best = Math.max(best, f.weight);
  }
  if (d.airportCodes.some((c) => c.startsWith(code))) best = Math.max(best, 55);
  return best;
}

export interface SearchOptions {
  query?: string;
  facet?: DestinationFacet;
  /** Only destinations we can actually fly to (have their own airport). */
  flightOnly?: boolean;
  limit?: number;
}

/**
 * The single entry point for destination lookup. Always validates first, so an
 * invalid or duplicated catalog row can never surface in the UI.
 */
export function searchDestinations(
  catalog: Destination[],
  { query = "", facet = "all", flightOnly = false, limit }: SearchOptions = {},
): Destination[] {
  let pool = validDestinations(catalog).filter((d) => matchesFacet(d, facet));
  if (flightOnly) pool = pool.filter(isFlightDestination);

  const q = query.trim();
  if (q) {
    pool = pool
      .map((d) => ({ d, score: scoreDestination(d, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.d.name.localeCompare(b.d.name, "he"))
      .map((x) => x.d);
  }
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

/** Group results by country, preserving order. */
export function groupDestinationsByCountry(list: Destination[]) {
  const map = new Map<string, { emoji: string; items: Destination[] }>();
  for (const d of list) {
    const g = map.get(d.country) ?? { emoji: d.emoji, items: [] };
    g.items.push(d);
    map.set(d.country, g);
  }
  return Array.from(map.entries());
}

const RECENT_KEY = "nitzi:recent-destinations";
const RECENT_MAX = 6;

export function readRecentDestinations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function rememberDestination(slug: string): void {
  if (typeof window === "undefined" || !slug || slug === "surprise") return;
  try {
    const next = [slug, ...readRecentDestinations().filter((s) => s !== slug)].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a nicety, not a requirement */
  }
}
