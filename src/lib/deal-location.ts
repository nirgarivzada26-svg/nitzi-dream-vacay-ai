// Location facts derived from real coordinates only.
//
// The catalog stores city coordinates (destinations.latitude/longitude).
// Hotel-level coordinates are NOT available from the demo provider, so we never
// draw a hotel pin at a made-up point: the map is centred on the city and the
// UI states that the exact hotel location is confirmed after supplier
// verification. Missing/invalid coordinates disable the map entirely.

import type { Destination } from "./catalog";

export interface Coords {
  lat: number;
  lon: number;
}

export const NO_LOCATION_LABEL = "פרטי המיקום המדויקים אינם זמינים כרגע.";

export function isValidCoords(lat: number | null, lon: number | null): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

export function destinationCoords(dest: Destination): Coords | null {
  return isValidCoords(dest.latitude, dest.longitude)
    ? { lat: dest.latitude as number, lon: dest.longitude as number }
    : null;
}

/** Great-circle distance in km. */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface LocationFact {
  label: string;
  value: string;
}

/**
 * Only facts backed by stored catalog values are returned. Anything we cannot
 * compute is simply absent — never guessed.
 */
export function locationFacts(dest: Destination): LocationFact[] {
  const facts: LocationFact[] = [];
  if (dest.subregion) facts.push({ label: "אזור", value: dest.subregion });
  facts.push({ label: "עיר", value: `${dest.name}, ${dest.country}` });
  if (dest.airportCodes.length > 0)
    facts.push({ label: "שדות תעופה", value: dest.airportCodes.join(" · ") });
  if (dest.timezone) facts.push({ label: "אזור זמן", value: dest.timezone });
  if (dest.currency) facts.push({ label: "מטבע", value: dest.currency });
  if (dest.languages.length > 0) facts.push({ label: "שפות", value: dest.languages.join(", ") });
  facts.push({
    label: "טיסה מתל אביב",
    value: `${dest.flightHours} שעות · ${dest.directFlightFromTLV ? "קיימת טיסה ישירה" : "בדרך כלל עם עצירה"}`,
  });
  return facts;
}

export function osmEmbedUrl(c: Coords, span = 0.09): string {
  const bbox = [c.lon - span, c.lat - span * 0.8, c.lon + span, c.lat + span * 0.8]
    .map((n) => n.toFixed(5))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat.toFixed(5)}%2C${c.lon.toFixed(5)}`;
}

export function osmLinkUrl(c: Coords): string {
  return `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=13/${c.lat}/${c.lon}`;
}

export function navigateUrl(query: string, c: Coords): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}&destination_place_id=&travelmode=driving&hl=he&q=${encodeURIComponent(query)}`;
}

export function osmSearchUrl(kind: "restaurants" | "beaches" | "attractions", c: Coords): string {
  const term =
    kind === "restaurants" ? "restaurant" : kind === "beaches" ? "beach" : "tourism attraction";
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(term)}#map=14/${c.lat}/${c.lon}`;
}
