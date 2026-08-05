// Catalog validation. The destination catalog is data-driven (DB managed), so
// every consumer runs rows through these guards before rendering: an invalid
// or duplicated destination must never reach a selector or a public page.

import type { Destination } from "./catalog";

export type DestinationIssue =
  | "missing-slug"
  | "missing-city"
  | "invalid-latitude"
  | "invalid-longitude"
  | "invalid-country-code"
  | "invalid-currency"
  | "missing-timezone"
  | "duplicate-slug"
  | "duplicate-city"
  | "duplicate-airport-code"
  | "missing-airport";

const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const AIRPORT = /^[A-Z]{3}$/;

/** Issues that can be judged on a single row, without catalog context. */
export function destinationIssues(d: Destination): DestinationIssue[] {
  const issues: DestinationIssue[] = [];
  if (!d.slug.trim()) issues.push("missing-slug");
  if (!d.cityEn.trim()) issues.push("missing-city");
  if (d.latitude === null || !Number.isFinite(d.latitude) || Math.abs(d.latitude) > 90)
    issues.push("invalid-latitude");
  if (d.longitude === null || !Number.isFinite(d.longitude) || Math.abs(d.longitude) > 180)
    issues.push("invalid-longitude");
  if (!COUNTRY_CODE.test(d.countryCode)) issues.push("invalid-country-code");
  if (d.currency && !CURRENCY.test(d.currency)) issues.push("invalid-currency");
  if (!d.timezone.trim()) issues.push("missing-timezone");
  if (d.airportCodes.some((c) => !AIRPORT.test(c))) issues.push("missing-airport");
  return issues;
}

export function isValidDestination(d: Destination): boolean {
  return destinationIssues(d).length === 0;
}

/** A destination we can offer flights for needs at least one airport of its own. */
export function isFlightDestination(d: Destination): boolean {
  return isValidDestination(d) && d.airportCodes.length > 0;
}

export interface CatalogAudit {
  valid: Destination[];
  rejected: { destination: Destination; issues: DestinationIssue[] }[];
}

/**
 * Validates a whole catalog: per-row rules plus cross-row uniqueness
 * (slug, city+country, airport codes). First occurrence wins.
 */
export function auditCatalog(list: Destination[]): CatalogAudit {
  const valid: Destination[] = [];
  const rejected: CatalogAudit["rejected"] = [];
  const slugs = new Set<string>();
  const cities = new Set<string>();
  const airports = new Set<string>();

  for (const d of list) {
    const issues = destinationIssues(d);
    const cityKey = `${d.cityEn.trim().toLowerCase()}|${d.countryCode}`;
    if (slugs.has(d.slug)) issues.push("duplicate-slug");
    if (d.cityEn && cities.has(cityKey)) issues.push("duplicate-city");
    if (d.airportCodes.some((c) => airports.has(c))) issues.push("duplicate-airport-code");

    if (issues.length > 0) {
      rejected.push({ destination: d, issues });
      continue;
    }
    slugs.add(d.slug);
    cities.add(cityKey);
    for (const c of d.airportCodes) airports.add(c);
    valid.push(d);
  }
  return { valid, rejected };
}

/** Convenience: the subset of the catalog that is safe to show publicly. */
export function validDestinations(list: Destination[]): Destination[] {
  return auditCatalog(list).valid;
}
