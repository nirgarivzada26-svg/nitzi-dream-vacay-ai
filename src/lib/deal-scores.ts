// Slice 3.5 — Travel Intelligence scoring.
//
// Every metric is derived from structured catalog/offer fields. A metric that
// has no supporting field returns `value: null` and is rendered as
// "אין נתונים מאומתים" — never guessed, never averaged into the total.

import type { Destination } from "./catalog";
import type { Deal } from "./deals";
import { boardLabels } from "./deals";
import { findAlternative, type FlightAlternative } from "./deal-alternatives";
import { smartPrice } from "./smart-price";

export const NO_DATA = "אין נתונים מאומתים";

export interface Metric {
  key: string;
  label: string;
  /** 0-100, or null when the catalog has no field backing this metric. */
  value: number | null;
  /** Exactly which structured field produced the number. */
  basis: string;
}

export interface ScoreGroup {
  key: string;
  label: string;
  value: number | null;
  metrics: Metric[];
}

export interface ScoreBreakdown {
  groups: ScoreGroup[];
  overall: number | null;
  coverage: { scored: number; total: number };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function average(metrics: Metric[]): number | null {
  const vals = metrics.map((m) => m.value).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return clamp(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/* ------------------------------- hotel ---------------------------------- */

export function hotelMetrics(deal: Deal): Metric[] {
  const h = deal.hotel;
  const dest = deal.destination;
  const perNight = deal.price.perPerson / Math.max(1, deal.dates.nights);
  const baseline = dest.avgBudgetPerPerson / Math.max(1, deal.dates.nights);

  const familySignal =
    dest.matches.includes("family") || dest.travelCategories.includes("family");
  const coupleSignal =
    dest.matches.includes("romantic") || dest.travelCategories.includes("romantic");

  return [
    {
      key: "guest",
      label: "שביעות רצון אורחים",
      value: clamp((h.guestRating / 10) * 100),
      basis: `דירוג ${h.guestRating.toFixed(1)}/10 מתוך ${h.reviewsCount.toLocaleString("he-IL")} ביקורות בקטלוג`,
    },
    {
      key: "room",
      label: "רמת חדר ומתקנים",
      value: clamp(((h.stars - 1) / 4) * 100),
      basis: `דירוג רשמי ${h.stars}★`,
    },
    {
      key: "board",
      label: "מה כלול באירוח",
      value:
        deal.board === "all-inclusive"
          ? 100
          : deal.board === "half-board"
            ? 80
            : deal.board === "breakfast"
              ? 60
              : 35,
      basis: `בסיס אירוח: ${boardLabels[deal.board]}`,
    },
    {
      key: "value",
      label: "תמורה למחיר",
      value:
        baseline > 0
          ? clamp(50 + ((baseline - perNight) / baseline) * 120)
          : null,
      basis:
        baseline > 0
          ? `₪${Math.round(perNight).toLocaleString("he-IL")} ללילה לאדם מול ממוצע ₪${Math.round(baseline).toLocaleString("he-IL")} ליעד`
          : NO_DATA,
    },
    {
      key: "family",
      label: "התאמה למשפחות",
      value: familySignal ? clamp(60 + (h.stars - 3) * 10) : null,
      basis: familySignal
        ? "היעד מתויג בקטלוג כמתאים למשפחות"
        : `${NO_DATA} — אין תיוג משפחות ליעד`,
    },
    {
      key: "couples",
      label: "התאמה לזוגות",
      value: coupleSignal ? clamp(60 + (h.guestRating - 8) * 15) : null,
      basis: coupleSignal
        ? "היעד מתויג בקטלוג כמתאים לזוגות"
        : `${NO_DATA} — אין תיוג זוגות ליעד`,
    },
  ];
}

/* ------------------------------- flight --------------------------------- */

function hourOf(iso: string) {
  const d = new Date(iso);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

/** Civilised hours score: 07:00-20:00 best, red-eye worst. */
function timeScore(iso: string) {
  const h = hourOf(iso);
  if (h >= 7 && h <= 20) return 100;
  if (h >= 5 && h < 7) return 70;
  if (h > 20 && h <= 23) return 65;
  return 35;
}

export function flightMetrics(deal: Deal, alt: FlightAlternative | null): Metric[] {
  const stops = deal.outbound.stops + deal.inbound.stops;
  const hours = deal.outbound.durationMinutes / 60;

  const bag: Metric = alt
    ? {
        key: "baggage",
        label: "כבודה",
        value: clamp(
          (alt.carryOnIncluded ? 40 : 0) + (alt.checkedBagIncluded ? 60 : 0),
        ),
        basis: `${alt.carryOnIncluded ? "טרולי כלול" : "ללא טרולי"} · ${
          alt.checkedBagIncluded
            ? `מזוודה ${alt.checkedBagKg ?? "?"} ק״ג כלולה`
            : "מזוודה בתשלום"
        }`,
      }
    : { key: "baggage", label: "כבודה", value: null, basis: `${NO_DATA} — תנאי מזוודה לא נמסרו` };

  return [
    {
      key: "direct",
      label: "ישירות",
      value: stops === 0 ? 100 : stops === 1 ? 55 : 30,
      basis: stops === 0 ? "ישירה בשני הכיוונים" : `${stops} עצירות בסך הכל`,
    },
    {
      key: "duration",
      label: "משך טיסה",
      value: clamp(100 - Math.max(0, hours - 3) * 12),
      basis: `${hours.toFixed(1)} שעות בהלוך`,
    },
    {
      key: "depart",
      label: "שעת יציאה",
      value: timeScore(deal.outbound.departAt),
      basis: `המראה ${new Date(deal.outbound.departAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`,
    },
    {
      key: "arrive",
      label: "שעת חזרה",
      value: timeScore(deal.inbound.arriveAt),
      basis: `נחיתה בחזור ${new Date(deal.inbound.arriveAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`,
    },
    bag,
  ];
}

/* ------------------------------ location -------------------------------- */

const LOCATION_SIGNALS: { key: string; label: string; words: string[] }[] = [
  { key: "beach", label: "חופים", words: ["חוף", "beach", "ים", "מפרץ", "לגונה"] },
  { key: "center", label: "מרכז עיר", words: ["מרכז", "כיכר", "עיר עתיקה", "רובע", "שדרות"] },
  { key: "nightlife", label: "חיי לילה", words: ["בר", "מועדון", "לילה", "פאב", "יין"] },
  { key: "family", label: "משפחות", words: ["פארק", "גן חיות", "אקווריום", "לונה", "מוזיאון"] },
  { key: "transport", label: "תחבורה ציבורית", words: ["רכבת", "מטרו", "תחתית", "טראם", "אוטובוס"] },
  { key: "shopping", label: "קניות", words: ["שוק", "קניון", "שופינג", "חנויות", "מרקט"] },
  { key: "walk", label: "הליכתיות", words: ["טיילת", "רגל", "סמטה", "עיר עתיקה", "רחוב"] },
];

export function locationMetrics(dest: Destination): Metric[] {
  const corpus = [
    ...dest.attractions,
    ...dest.restaurants,
    ...dest.itinerary,
    dest.tagline,
    dest.shortDescription,
    ...dest.travelCategories,
    ...dest.matches,
  ]
    .join(" ")
    .toLowerCase();

  return LOCATION_SIGNALS.map(({ key, label, words }) => {
    const hits = words.filter((w) => corpus.includes(w.toLowerCase()));
    if (hits.length === 0)
      return { key, label, value: null, basis: `${NO_DATA} — אין אזכור בקטלוג היעד` };
    return {
      key,
      label,
      value: clamp(55 + hits.length * 15),
      basis: `נמצאו ${hits.length} אזכורים בקטלוג: ${hits.slice(0, 3).join(", ")}`,
    };
  });
}

/* ------------------------- price / value / total ------------------------ */

export function priceMetrics(deal: Deal, peers: Deal[]): Metric[] {
  const verdict = smartPrice(
    deal,
    peers.map((p) => p.price.perPerson),
  );
  const baseline = deal.destination.avgBudgetPerPerson;

  return [
    {
      key: "vs-avg",
      label: "מול ממוצע היעד",
      value:
        baseline > 0
          ? clamp(50 + ((baseline - deal.price.perPerson) / baseline) * 100)
          : null,
      basis:
        baseline > 0
          ? `₪${deal.price.perPerson.toLocaleString("he-IL")} מול ממוצע ₪${baseline.toLocaleString("he-IL")} לאדם`
          : NO_DATA,
    },
    {
      key: "market",
      label: "מול הצעות מקבילות",
      value: verdict ? clamp(50 - verdict.deltaPct * 2) : null,
      basis: verdict
        ? `${verdict.label} · ${verdict.basis.observations} הצעות להשוואה`
        : `${NO_DATA} — אין מספיק הצעות להשוואה`,
    },
    {
      key: "discount",
      label: "הנחה ממחירון",
      value: deal.discountPct > 0 ? clamp(40 + deal.discountPct * 2.5) : null,
      basis:
        deal.discountPct > 0
          ? `${deal.discountPct}% הנחה ממחיר המחירון`
          : `${NO_DATA} — הספק לא מסר מחיר מחירון`,
    },
    {
      key: "flex",
      label: "גמישות ביטול",
      value: deal.freeCancellation ? 95 : 40,
      basis: deal.freeCancellation ? "ביטול חינם לפי מדיניות הספק" : "ללא ביטול חינם",
    },
  ];
}

export function scoreBreakdown(deal: Deal, peers: Deal[] = [], flightId?: string | null): ScoreBreakdown {
  const alt = findAlternative(deal, flightId ?? null);
  const hotel = hotelMetrics(deal);
  const flight = flightMetrics(deal, alt);
  const location = locationMetrics(deal.destination);
  const price = priceMetrics(deal, peers);

  const groups: ScoreGroup[] = [
    { key: "hotel", label: "מלון", value: average(hotel), metrics: hotel },
    { key: "flight", label: "טיסה", value: average(flight), metrics: flight },
    { key: "location", label: "מיקום", value: average(location), metrics: location },
    { key: "price", label: "מחיר", value: average(price), metrics: price },
  ];

  const valueMetrics: Metric[] = [
    ...hotel.filter((m) => m.key === "value" || m.key === "board"),
    ...price.filter((m) => m.key === "vs-avg" || m.key === "market"),
    ...flight.filter((m) => m.key === "direct" || m.key === "baggage"),
  ];
  groups.push({
    key: "value",
    label: "תמורה כוללת",
    value: average(valueMetrics),
    metrics: valueMetrics,
  });

  const all = [...hotel, ...flight, ...location, ...price];
  const scored = all.filter((m) => m.value !== null).length;

  const weights: Record<string, number> = { hotel: 0.3, flight: 0.25, location: 0.15, price: 0.3 };
  let sum = 0;
  let w = 0;
  for (const g of groups) {
    if (g.key === "value" || g.value === null) continue;
    sum += g.value * (weights[g.key] ?? 0);
    w += weights[g.key] ?? 0;
  }

  return {
    groups,
    overall: w > 0 ? clamp(sum / w) : null,
    coverage: { scored, total: all.length },
  };
}
