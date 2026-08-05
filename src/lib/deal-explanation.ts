// "למה NITZI בחרה בדיל הזה?" — every line is derived from a structured field
// on the canonical deal (board, stars, stops, coordinates, catalog averages).
// Nothing is generated freely; when a section has no supporting field it is
// omitted, and when almost nothing is available the caller shows the fallback.

import type { Deal } from "./deals";
import { boardLabels } from "./deals";
import { smartPrice } from "./smart-price";
import { nitziScore } from "./deal-score";
import { flightAlternatives } from "./deal-alternatives";

export const NOT_ENOUGH_DATA =
  "אין מספיק מידע מאומת להצגת הסבר מלא.";

export interface ExplanationSection {
  key: string;
  title: string;
  points: string[];
}

export interface DealExplanation {
  sections: ExplanationSection[];
  hasEnoughData: boolean;
  fallback: string;
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

export function explainDeal(deal: Deal, peers: Deal[] = []): DealExplanation {
  const dest = deal.destination;
  const sections: ExplanationSection[] = [];
  const add = (key: string, title: string, points: (string | null | false)[]) => {
    const clean = points.filter((p): p is string => typeof p === "string" && p.length > 0);
    if (clean.length > 0) sections.push({ key, title, points: clean });
  };

  const month = new Date(deal.dates.start).getMonth() + 1;
  const inSeason = dest.bestTravelMonths.includes(month);
  const verdict = smartPrice(
    deal,
    peers.map((p) => p.price.perPerson),
  );
  const direct = deal.outbound.stops === 0 && deal.inbound.stops === 0;
  const cheaper = peers.filter((p) => p.price.perPerson < deal.price.perPerson);
  const better = peers.filter(
    (p) => p.hotel.stars > deal.hotel.stars || p.hotel.guestRating > deal.hotel.guestRating + 0.3,
  );

  add("destination", "למה היעד הזה", [
    dest.shortDescription || dest.tagline || null,
    `${dest.flightHours} שעות טיסה מתל אביב${dest.directFlightFromTLV ? " · קיימת טיסה ישירה" : ""}`,
    dest.bestTravelMonths.length > 0
      ? `חודשים מומלצים ביעד: ${dest.bestTravelMonths.map((m) => MONTHS_HE[m - 1]).join(", ")}${inSeason ? " — התאריכים שנבחרו בתוך העונה המומלצת" : ""}`
      : null,
    dest.travelCategories.length > 0 ? `מתאים ל: ${dest.travelCategories.join(", ")}` : null,
  ]);

  add("hotel", "למה המלון הזה", [
    `${deal.hotel.name} · ${deal.hotel.stars}★`,
    `דירוג אורחים ${deal.hotel.guestRating.toFixed(1)}/10 מתוך ${deal.hotel.reviewsCount.toLocaleString("he-IL")} ביקורות`,
    deal.hotel.note || null,
    `בסיס אירוח: ${boardLabels[deal.board]}`,
    deal.freeCancellation ? "ביטול חינם לפי מדיניות הספק" : null,
  ]);

  add("flight", "למה הטיסה הזו", [
    `${deal.outbound.airline} · טיסה ${deal.outbound.flightNumber}`,
    direct ? "טיסה ישירה לשני הכיוונים" : `${deal.outbound.stops} עצירות בהלוך`,
    `משך טיסה: ${Math.round(deal.outbound.durationMinutes / 60)} שעות`,
    `שעת המראה: ${new Date(deal.outbound.departAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`,
  ]);

  add("location", "איך המיקום", [
    dest.subregion ? `אזור: ${dest.subregion}` : null,
    dest.airportCodes.length > 0 ? `שדות תעופה: ${dest.airportCodes.join(", ")}` : null,
    dest.latitude !== null && dest.longitude !== null
      ? "מיקום העיר מאומת בקטלוג — מיקום המלון המדויק יאושר מול הספק"
      : null,
  ]);

  add("area", "מה יש באזור", [
    dest.attractions.length > 0 ? `אטרקציות: ${dest.attractions.slice(0, 4).join(" · ")}` : null,
    dest.restaurants.length > 0 ? `מסעדות: ${dest.restaurants.slice(0, 4).join(" · ")}` : null,
  ]);

  add("audience", "למי החבילה מתאימה", [
    dest.matches.length > 0 ? `סוגי חופשה: ${dest.matches.join(", ")}` : null,
    `${deal.people} נוסעים · ${deal.dates.nights} לילות`,
    deal.board === "all-inclusive" ? "מתאים למי שמעדיף תקציב סגור מראש" : null,
  ]);

  add("package", "למה החבילה הזו", [
    `${deal.dates.nights} לילות · ${deal.people} נוסעים · ${boardLabels[deal.board]}`,
    deal.includes.length > 0 ? `כלול בחבילה: ${deal.includes.slice(0, 4).join(" · ")}` : null,
    "טיסות ומלון נרכשים כחבילה אחת — הרכיבים מתומחרים יחד ולא בנפרד.",
  ]);

  add("now", "למה עכשיו", [
    inSeason ? "התאריכים נופלים בעונה המומלצת ביעד לפי הקטלוג" : null,
    deal.discountPct >= 5 ? `הספק מציג הנחה של ${deal.discountPct}% ממחיר המחירון` : null,
    deal.price.availability === "limited" ? "הזמינות מסומנת כמוגבלת אצל הספק" : null,
    deal.price.availability === "sold-out" ? "החבילה מסומנת כאזלה אצל הספק" : null,
    `הצעת המחיר נבדקה לאחרונה ותקפה ל-${Math.round(deal.price.ttlSeconds / 60)} דקות ממועד הבדיקה`,
  ]);

  add("pros", "יתרונות", [

    direct ? "טיסה ישירה" : null,
    deal.board !== "room-only" ? `${boardLabels[deal.board]} כלול` : null,
    deal.freeCancellation ? "ביטול חינם" : null,
    deal.hotel.guestRating >= 8.8 ? "דירוג אורחים גבוה" : null,
    verdict && (verdict.level === "great" || verdict.level === "good")
      ? "מחיר נמוך מהממוצע ליעד"
      : null,
    deal.discountPct >= 10 ? `הנחה של ${deal.discountPct}% ממחיר המחירון` : null,
  ]);

  add("cons", "חסרונות", [
    !direct ? "הטיסה כוללת עצירה" : null,
    deal.board === "room-only" ? "ללא ארוחות" : null,
    !deal.freeCancellation ? "ללא ביטול חינם" : null,
    verdict?.level === "expensive" ? "המחיר גבוה מהממוצע ליעד" : null,
    deal.outbound.durationMinutes > 7 * 60 ? "טיסה ארוכה" : null,
  ]);

  const tradeoff = !direct
    ? "הפשרה המרכזית: מחיר נמוך יותר תמורת עצירה בדרך."
    : deal.board === "room-only"
      ? "הפשרה המרכזית: המחיר לא כולל ארוחות."
      : verdict?.level === "expensive"
        ? "הפשרה המרכזית: מחיר גבוה מהממוצע תמורת מלון ותנאי טיסה טובים יותר."
        : "הפשרה המרכזית: אין ויתור משמעותי בנתונים שקיימים לחבילה הזו.";
  add("tradeoff", "מה הפשרה המרכזית", [tradeoff]);

  add("cheaper", "האם קיימת אפשרות זולה יותר", [
    cheaper.length > 0
      ? `כן — ${cheaper.length} חבילות זולות יותר ל${dest.name}, החל מ-₪${Math.min(...cheaper.map((c) => c.price.perPerson)).toLocaleString("he-IL")} לאדם.`
      : peers.length > 0
        ? "לא נמצאה חבילה זולה יותר ליעד בתאריכים אלה."
        : null,
    flightAlternatives(deal).some((a) => a.priceDeltaPerPerson < 0)
      ? "קיימת אפשרות טיסה זולה יותר — ניתן להחליף בסעיף אפשרויות הטיסה."
      : null,
  ]);

  add("better", "האם קיימת אפשרות טובה יותר", [
    better.length > 0
      ? `כן — ${better.length} חבילות עם מלון מדורג גבוה יותר ל${dest.name}.`
      : peers.length > 0
        ? "לא נמצאה חבילה עם מלון מדורג גבוה יותר בתאריכים אלה."
        : null,
    `ניקוד NITZI לחבילה: ${nitziScore(deal).value}/100`,
  ]);

  add("direct", "האם הטיסה ישירה", [
    direct ? "כן — ללא עצירות בשני הכיוונים." : "לא — הטיסה כוללת עצירה.",
    dest.directFlightFromTLV
      ? "ליעד קיימות טיסות ישירות מתל אביב."
      : "ליעד אין טיסה ישירה קבועה מתל אביב.",
  ]);

  add("value", "האם המחיר נחשב משתלם", [
    verdict ? `${verdict.label} — ${verdict.detail}` : null,
    verdict?.basis.observations
      ? `מבוסס על ${verdict.basis.observations} הצעות להשוואה.`
      : "מבוסס על המחיר הממוצע ליעד בקטלוג NITZI.",
  ]);

  return {
    sections,
    hasEnoughData: sections.length >= 4,
    fallback: NOT_ENOUGH_DATA,
  };
}
