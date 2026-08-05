// Slice 3.6 — Concierge itinerary.
//
// Day-by-day plan assembled ONLY from structured data:
//   flight times (deal.outbound/inbound), nights, board basis, hotel name,
//   dest.itinerary / dest.attractions / dest.restaurants / dest.travelCategories.
// A slot never names a business that is not in the catalog. Slots with no
// backing data are omitted; a day that ends up with no backed slot is still
// shown with its travel-logic slots only (arrival/departure/board meals).

import type { Destination } from "../catalog";
import { boardLabels, type Deal } from "../deals";

export const NO_ITINERARY_DATA =
  "אין מספיק תוכן מובנה ביעד כדי להציע מסלול יומי מלא.";

export type SlotKind =
  | "arrival"
  | "checkin"
  | "meal"
  | "beach"
  | "activity"
  | "evening"
  | "free"
  | "checkout"
  | "departure";

export interface ItinerarySlot {
  kind: SlotKind;
  time: string | null;
  title: string;
  detail: string | null;
  /** Structured field this slot came from. */
  source: string;
}

export interface ItineraryDay {
  day: number;
  date: string; // ISO date
  label: string;
  slots: ItinerarySlot[];
}

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const has = (dest: Destination, ...keys: string[]) =>
  keys.some(
    (k) => dest.travelCategories.includes(k) || (dest.matches as string[]).includes(k),
  );

function boardMeal(deal: Deal, meal: "breakfast" | "lunch" | "dinner"): ItinerarySlot | null {
  const b = deal.board;
  const included =
    (meal === "breakfast" && b !== "room-only") ||
    (meal === "dinner" && (b === "half-board" || b === "all-inclusive")) ||
    (meal === "lunch" && b === "all-inclusive");
  if (!included) return null;
  const label =
    meal === "breakfast" ? "ארוחת בוקר במלון" : meal === "lunch" ? "ארוחת צהריים במלון" : "ארוחת ערב במלון";
  return {
    kind: "meal",
    time: meal === "breakfast" ? "08:00" : meal === "lunch" ? "13:00" : "19:30",
    title: label,
    detail: `כלול בבסיס האירוח: ${boardLabels[b]}`,
    source: "שדה board בחבילה",
  };
}

function restaurantSlot(dest: Destination, i: number, time: string): ItinerarySlot | null {
  const name = dest.restaurants[i];
  if (!name) return null;
  return {
    kind: "meal",
    time,
    title: name,
    detail: "מתוך רשימת המסעדות המתועדות ביעד",
    source: "עמודת restaurants בקטלוג היעדים",
  };
}

function attractionSlot(dest: Destination, i: number, time: string): ItinerarySlot | null {
  const name = dest.attractions[i];
  if (!name) return null;
  return {
    kind: "activity",
    time,
    title: name,
    detail: "אטרקציה מתועדת בקטלוג היעד",
    source: "עמודת attractions בקטלוג היעדים",
  };
}

function itinerarySlot(dest: Destination, i: number): ItinerarySlot | null {
  const line = dest.itinerary[i];
  if (!line) return null;
  return {
    kind: "activity",
    time: null,
    title: line,
    detail: null,
    source: "עמודת itinerary בקטלוג היעדים",
  };
}

export function buildItinerary(deal: Deal): ItineraryDay[] {
  const dest = deal.destination;
  const nights = Math.max(1, deal.dates.nights);
  const days: ItineraryDay[] = [];
  let att = 0;
  let rest = 0;
  let plan = 0;

  for (let i = 0; i <= nights; i++) {
    const isFirst = i === 0;
    const isLast = i === nights;
    const slots: ItinerarySlot[] = [];

    if (isFirst) {
      slots.push({
        kind: "arrival",
        time: hhmm(deal.outbound.arriveAt),
        title: `נחיתה ב${dest.name}`,
        detail: `${deal.outbound.airline} ${deal.outbound.flightNumber}${
          deal.outbound.stops === 0 ? " · טיסה ישירה" : ` · ${deal.outbound.stops} עצירות`
        }`,
        source: "פרטי הטיסה בהצעה",
      });
      slots.push({
        kind: "checkin",
        time: "15:00",
        title: `צ'ק-אין ב${deal.hotel.name}`,
        detail: deal.hotel.note || null,
        source: "פרטי המלון בהצעה",
      });
      const dinner = restaurantSlot(dest, rest, "20:00") ?? boardMeal(deal, "dinner");
      if (dinner) {
        if (dinner.source.includes("restaurants")) rest++;
        slots.push(dinner);
      }
      const evening = itinerarySlot(dest, plan);
      if (evening) {
        plan++;
        slots.push({ ...evening, kind: "evening" });
      } else if (has(dest, "nightlife")) {
        slots.push({
          kind: "evening",
          time: "22:00",
          title: "ערב בעיר",
          detail: "היעד מסווג בקטלוג כיעד חיי לילה",
          source: "עמודת travel_categories ביעד",
        });
      }
    } else if (isLast) {
      const bf = boardMeal(deal, "breakfast");
      if (bf) slots.push(bf);
      slots.push({
        kind: "checkout",
        time: "11:00",
        title: "צ'ק-אאוט מהמלון",
        detail: null,
        source: "נוהל שעות המלון בהצעה",
      });
      slots.push({
        kind: "departure",
        time: hhmm(deal.inbound.departAt),
        title: "טיסה חזרה לתל אביב",
        detail: `${deal.inbound.airline} ${deal.inbound.flightNumber}`,
        source: "פרטי הטיסה בהצעה",
      });
    } else {
      const bf = boardMeal(deal, "breakfast");
      if (bf) slots.push(bf);

      if (has(dest, "beach", "island"))
        slots.push({
          kind: "beach",
          time: "10:00",
          title: "בוקר על החוף",
          detail: "היעד מסווג בקטלוג כיעד חוף",
          source: "עמודת travel_categories ביעד",
        });

      const morning = attractionSlot(dest, att, "10:30") ?? itinerarySlot(dest, plan);
      if (morning) {
        if (morning.source.includes("attractions")) att++;
        else plan++;
        slots.push(morning);
      }

      const lunch = restaurantSlot(dest, rest, "13:30") ?? boardMeal(deal, "lunch");
      if (lunch) {
        if (lunch.source.includes("restaurants")) rest++;
        slots.push(lunch);
      }

      const afternoon = attractionSlot(dest, att, "16:00");
      if (afternoon) {
        att++;
        slots.push(afternoon);
      }

      const dinner = restaurantSlot(dest, rest, "20:00") ?? boardMeal(deal, "dinner");
      if (dinner) {
        if (dinner.source.includes("restaurants")) rest++;
        slots.push(dinner);
      }
    }

    days.push({
      day: i + 1,
      date: addDays(deal.dates.start, i),
      label: isFirst ? "יום ההגעה" : isLast ? "יום החזרה" : `יום ${i + 1}`,
      slots,
    });
  }

  return days;
}

/** True when the plan contains at least one destination-content slot. */
export function itineraryHasContent(days: ItineraryDay[]): boolean {
  return days.some((d) => d.slots.some((s) => s.source.includes("קטלוג")));
}
