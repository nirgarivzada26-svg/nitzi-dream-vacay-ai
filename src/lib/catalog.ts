// NITZI destination catalog.
//
// The catalog is managed in the database (`public.destinations`) — never as a
// hardcoded list in the UI. This module only maps DB rows to the shape the app
// renders, and resolves a bundled cover image per destination/country.
//
// `hasOffers` marks destinations for which the offers layer can currently
// produce a bookable package. Everything else is browsable but explicitly
// shows "no offers available yet" instead of inventing data.

import santoriniImg from "@/assets/dest-santorini.jpg";
import amalfiImg from "@/assets/dest-amalfi.jpg";
import dubaiImg from "@/assets/dest-dubai.jpg";
import athensImg from "@/assets/dest-athens.jpg";
import rhodesImg from "@/assets/dest-rhodes.jpg";
import cyprusImg from "@/assets/dest-cyprus.jpg";
import romeImg from "@/assets/dest-rome.jpg";
import barcelonaImg from "@/assets/dest-barcelona.jpg";
import lisbonImg from "@/assets/dest-lisbon.jpg";
import parisImg from "@/assets/dest-paris.jpg";
import londonImg from "@/assets/dest-london.jpg";
import pragueImg from "@/assets/dest-prague.jpg";

import type { QuizAnswers, TripType } from "./nitzi-data";

export interface DestinationHotel {
  name: string;
  note: string;
}

export interface Destination {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  emoji: string;
  region: string;
  tagline: string;
  weather: string;
  flightHours: number;
  avgBudgetPerPerson: number;
  matches: TripType[];
  isPopular: boolean;
  hasOffers: boolean;
  /** Bundled cover image, or null when we don't have a verified photo. */
  image: string | null;
  hotels: DestinationHotel[];
  attractions: string[];
  restaurants: string[];
  itinerary: string[];
}

/** Raw row shape from `public.destinations`. */
export interface DestinationRow {
  slug: string;
  name: string;
  country: string;
  country_code: string;
  flag: string;
  region: string;
  tagline: string;
  weather: string;
  flight_hours: number | string;
  avg_budget_per_person: number;
  matches: string[] | null;
  is_popular: boolean;
  has_offers: boolean;
  hotels: DestinationHotel[] | null;
  attractions: string[] | null;
  restaurants: string[] | null;
  itinerary: string[] | null;
  sort_order: number;
}

const IMAGE_BY_SLUG: Record<string, string> = {
  santorini: santoriniImg,
  amalfi: amalfiImg,
  dubai: dubaiImg,
  athens: athensImg,
  rhodes: rhodesImg,
  larnaca: cyprusImg,
  rome: romeImg,
  barcelona: barcelonaImg,
  lisbon: lisbonImg,
  paris: parisImg,
  london: londonImg,
  prague: pragueImg,
};

const IMAGE_BY_COUNTRY: Record<string, string> = {
  GR: rhodesImg,
  CY: cyprusImg,
  IT: romeImg,
  ES: barcelonaImg,
  PT: lisbonImg,
  FR: parisImg,
  GB: londonImg,
  CZ: pragueImg,
  AE: dubaiImg,
};

export function imageFor(slug: string, countryCode: string): string | null {
  return IMAGE_BY_SLUG[slug] ?? IMAGE_BY_COUNTRY[countryCode] ?? null;
}

const TRIP_TYPES: TripType[] = [
  "beach", "adventure", "romantic", "family", "friends", "nightlife", "nature",
];

function toHotels(value: DestinationHotel[] | null): DestinationHotel[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((h) => {
    if (!h || typeof h !== "object") return [];
    const rec = h as Record<string, unknown>;
    if (typeof rec.name !== "string") return [];
    return [{ name: rec.name, note: typeof rec.note === "string" ? rec.note : "" }];
  });
}

export function rowToDestination(row: DestinationRow): Destination {
  return {
    slug: row.slug,
    name: row.name,
    country: row.country,
    countryCode: row.country_code,
    emoji: row.flag,
    region: row.region,
    tagline: row.tagline,
    weather: row.weather,
    flightHours: Number(row.flight_hours),
    avgBudgetPerPerson: row.avg_budget_per_person,
    matches: (row.matches ?? []).filter((m): m is TripType =>
      TRIP_TYPES.includes(m as TripType),
    ),
    isPopular: row.is_popular,
    hasOffers: row.has_offers,
    image: imageFor(row.slug, row.country_code),
    hotels: toHotels(row.hotels),
    attractions: row.attractions ?? [],
    restaurants: row.restaurants ?? [],
    itinerary: row.itinerary ?? [],
  };
}

export function findDestination(
  catalog: Destination[],
  key: string | null | undefined,
): Destination | null {
  if (!key) return null;
  const needle = key.trim();
  if (!needle || needle === "surprise") return null;
  return (
    catalog.find((d) => d.slug === needle) ??
    catalog.find((d) => d.name === needle) ??
    catalog.find((d) => d.name.includes(needle) || needle.includes(d.name)) ??
    null
  );
}

/**
 * Resolve the destination a set of quiz answers points at. Only catalog
 * destinations are ever returned — we never fabricate an off-catalog place.
 */
export function pickDestination(
  catalog: Destination[],
  answers: QuizAnswers,
): Destination | null {
  if (catalog.length === 0) return null;

  const explicit = findDestination(catalog, answers.destination);
  if (explicit) return explicit;

  const bookable = catalog.filter((d) => d.hasOffers);
  const pool = bookable.length > 0 ? bookable : catalog;

  const scored = pool
    .map((d) => {
      let score = 0;
      if (answers.type && d.matches.includes(answers.type)) score += 10;
      if (d.isPopular) score += 2;
      if (answers.budget >= d.avgBudgetPerPerson * 0.85) score += 4;
      return { d, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.d ?? null;
}

/** Groups the catalog by country, preserving catalog order. */
export function groupByCountry(catalog: Destination[]) {
  const map = new Map<string, { emoji: string; items: Destination[] }>();
  for (const d of catalog) {
    const group = map.get(d.country) ?? { emoji: d.emoji, items: [] };
    group.items.push(d);
    map.set(d.country, group);
  }
  return Array.from(map.entries());
}
