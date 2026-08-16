// Destination travel tips — assembled strictly from catalog columns.
// A category with no backing field is returned with `available: false` and the
// UI states that the data is missing instead of inventing advice.

import type { Destination } from "./catalog";

export const NO_TIP_DATA = "אין נתונים מאומתים בקטלוג עבור הקטגוריה הזו.";

export interface TipCategory {
  key: string;
  label: string;
  available: boolean;
  items: string[];
  source: string;
}

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

function cat(
  key: string,
  label: string,
  items: (string | null | false | undefined)[],
  source: string,
): TipCategory {
  const clean = items.filter((i): i is string => typeof i === "string" && i.trim().length > 0);
  return { key, label, available: clean.length > 0, items: clean, source };
}

export function travelTips(dest: Destination): TipCategory[] {
  const months = dest.bestTravelMonths.map((m) => MONTHS_HE[m - 1]).filter(Boolean);
  const offSeason =
    dest.bestTravelMonths.length > 0
      ? MONTHS_HE.filter((_, i) => !dest.bestTravelMonths.includes(i + 1))
      : [];

  return [
    cat(
      "areas",
      "אזורים ושכונות",
      [
        dest.subregion ? `אזור: ${dest.subregion}` : null,
        dest.itinerary.length > 0
          ? `אזורים במסלול המומלץ: ${dest.itinerary.slice(0, 4).join(" · ")}`
          : null,
      ],
      "עמודות subregion ו-itinerary בקטלוג היעדים",
    ),
    cat("food", "מסעדות ואוכל", dest.restaurants.slice(0, 6), "עמודת restaurants בקטלוג היעדים"),
    cat("attractions", "אטרקציות", dest.attractions.slice(0, 6), "עמודת attractions בקטלוג היעדים"),
    cat(
      "avoid",
      "מה כדאי להימנע ממנו",
      [
        offSeason.length > 0 && months.length > 0
          ? `חודשים שאינם מומלצים ביעד: ${offSeason.slice(0, 6).join(", ")}`
          : null,
        !dest.directFlightFromTLV
          ? "אין טיסה ישירה קבועה מתל אביב — כדאי להימנע מקונקשן קצר מדי"
          : null,
        dest.flightHours >= 8 ? "טיסה ארוכה — לא מומלץ לתכנן פעילות בשעות שאחרי הנחיתה" : null,
      ],
      "עמודות best_travel_months, direct_flight_from_tlv ו-flight_hours",
    ),
    cat(
      "transport",
      "תחבורה והגעה",
      [
        dest.airportCodes.length > 0 ? `שדות תעופה: ${dest.airportCodes.join(", ")}` : null,
        `${dest.flightHours} שעות טיסה מתל אביב`,
        dest.directFlightFromTLV ? "קיימות טיסות ישירות מתל אביב" : "אין טיסה ישירה קבועה מתל אביב",
      ],
      "עמודות airport_codes, flight_hours, direct_flight_from_tlv",
    ),
    cat(
      "money",
      "כסף ותקציב",
      [
        dest.currency ? `מטבע מקומי: ${dest.currency}` : null,
        dest.avgBudgetPerPerson > 0
          ? `תקציב ממוצע בקטלוג: ₪${dest.avgBudgetPerPerson.toLocaleString("he-IL")} לאדם`
          : null,
      ],
      "עמודות currency ו-avg_budget_per_person",
    ),
    cat(
      "weather",
      "מזג אוויר ועונתיות",
      [
        dest.weather || null,
        months.length > 0 ? `חודשים מומלצים: ${months.join(", ")}` : null,
        dest.timezone ? `אזור זמן: ${dest.timezone}` : null,
      ],
      "עמודות weather, best_travel_months, timezone",
    ),
    cat(
      "local",
      "מידע מקומי",
      [
        dest.languages.length > 0 ? `שפות: ${dest.languages.join(", ")}` : null,
        dest.travelCategories.length > 0
          ? `סוגי חופשה ביעד: ${dest.travelCategories.join(", ")}`
          : null,
        dest.averageTripDuration ? `משך טיול ממוצע: ${dest.averageTripDuration} לילות` : null,
      ],
      "עמודות languages, travel_categories, average_trip_duration",
    ),
  ];
}
