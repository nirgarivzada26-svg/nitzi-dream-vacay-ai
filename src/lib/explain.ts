// Rule-based explanations. Swap for an LLM call later without touching the UI —
// just replace the function bodies with a call to your model provider.

import type { Flight, Hotel, Package } from "./providers/types";
import type { QuizAnswers } from "./nitzi-data";
import { budgetFit } from "./ranking";

const AMENITY_LABEL: Record<string, string> = {
  pool: "בריכה", spa: "ספא", parking: "חניה", breakfast: "ארוחת בוקר",
  gym: "חדר כושר", wifi: "Wi-Fi", beachfront: "על החוף", family: "מתאים למשפחות",
  "adults-only": "למבוגרים בלבד", restaurant: "מסעדה", bar: "בר",
  "airport-shuttle": "הסעה משדה תעופה",
};
export const amenityLabel = (a: string) => AMENITY_LABEL[a] ?? a;

export function explainHotel(h: Hotel, a: QuizAnswers): string {
  const parts: string[] = [];
  const fit = budgetFit(h, a);
  if (fit === "within") parts.push("במסגרת התקציב שלך");
  else if (fit === "slightly-over") parts.push("מעט מעל התקציב, אבל שווה את התוספת");
  else parts.push("חורג מהתקציב — נשמר להשוואה");

  if (a.type === "romantic" && h.amenities.includes("adults-only")) parts.push("מתאים לזוגות (למבוגרים בלבד)");
  if (a.type === "family" && h.amenities.includes("family")) parts.push("ידידותי למשפחות");
  if (a.type === "beach" && (h.distanceToBeachKm ?? 9) < 1) parts.push(`${h.distanceToBeachKm} ק״מ מהים בלבד`);
  if (a.style === "luxury" && h.stars >= 5) parts.push("חמישה כוכבים לחוויה יוקרתית");
  if (a.style === "chill" && h.amenities.includes("spa")) parts.push("כולל ספא לרוגע מוחלט");
  if (h.guestRating >= 9) parts.push(`דירוג אורחים גבוה במיוחד (${h.guestRating})`);

  return `בחרתי במלון הזה כי הוא ${parts.slice(0, 3).join(", ")}.`;
}

export function explainFlight(f: Flight, a: QuizAnswers, cheapest?: Flight, fastest?: Flight): string {
  const parts: string[] = [];
  if (f.id === cheapest?.id) parts.push("העסקה המשתלמת ביותר במסלול");
  if (f.id === fastest?.id) parts.push("הטיסה המהירה ביותר");
  if (f.stops === 0) parts.push("ללא עצירות");
  else parts.push(`${f.stops} עצירות`);
  const dep = new Date(f.departAt);
  const h = dep.getHours();
  if (h >= 7 && h <= 11) parts.push("המראה נוחה בשעות הבוקר");
  if (a.people >= 3) parts.push("מחיר תואם למספר הנוסעים שהזנת");
  return `הטיסה הזו: ${parts.slice(0, 3).join(", ")}.`;
}

export function explainPackage(p: Package, a: QuizAnswers): string {
  const savePct = Math.round((p.savings / Math.max(1, p.separatePrice)) * 100);
  const parts = [
    `חוסך לך כ־${savePct}% לעומת הזמנה נפרדת`,
    `${p.nights} לילות ב-${p.hotel.name}`,
    `טיסה עם ${p.flight.airline}`,
  ];
  if (a.style === "luxury" && p.hotel.stars >= 5) parts.push("מלון חמישה כוכבים");
  return `החבילה מתאימה כי היא ${parts.slice(0, 3).join(", ")}.`;
}
