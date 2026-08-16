// Slice 3.6 — weather summary, strictly from destination columns.
// `weather` holds an air-temperature string; water temperature and rain
// probability are NOT stored in the catalog, so they are reported as missing.

import type { Destination } from "../catalog";

export const NO_WEATHER_DATA = "אין נתונים מאומתים.";

const MONTHS_HE = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

export interface WeatherFact {
  key: string;
  label: string;
  value: string | null;
  source: string;
}

export function weatherSummary(dest: Destination): WeatherFact[] {
  const air = dest.weather?.trim() ? dest.weather.trim() : null;
  const months = dest.bestTravelMonths.map((m) => MONTHS_HE[m - 1]).filter(Boolean);

  return [
    {
      key: "air",
      label: "טמפרטורה ממוצעת",
      value: air,
      source: air ? "עמודת weather בקטלוג היעדים" : NO_WEATHER_DATA,
    },
    { key: "water", label: "טמפרטורת מים", value: null, source: NO_WEATHER_DATA },
    { key: "rain", label: "סיכוי לגשם", value: null, source: NO_WEATHER_DATA },
    {
      key: "months",
      label: "חודשים מומלצים לנסיעה",
      value: months.length > 0 ? months.join(", ") : null,
      source: months.length > 0 ? "עמודת best_travel_months בקטלוג" : NO_WEATHER_DATA,
    },
    {
      key: "duration",
      label: "משך טיול ממוצע ביעד",
      value: dest.averageTripDuration ? `${dest.averageTripDuration} לילות` : null,
      source: dest.averageTripDuration ? "עמודת average_trip_duration" : NO_WEATHER_DATA,
    },
  ];
}

/** Whether the trip dates fall inside the destination's recommended months. */
export function inBestSeason(dest: Destination, startISO: string): boolean | null {
  if (dest.bestTravelMonths.length === 0) return null;
  const d = new Date(startISO.length <= 10 ? `${startISO}T00:00:00Z` : startISO);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  return dest.bestTravelMonths.includes(m);
}
