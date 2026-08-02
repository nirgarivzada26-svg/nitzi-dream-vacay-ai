// Shared, deterministic insight helpers derived only from the deal record
// itself — no invented facts. Used by the card, quick view and detail page so
// every surface shows the same NITZI score and the same reasoning.

import type { Deal } from "@/lib/deals";
import { smartPrice } from "@/lib/smart-price";

/** 0-100 quality score built from verified rating, price position and comfort. */
export function nitziScore(deal: Deal): number {
  const sp = smartPrice(deal);
  const ratingPart = (deal.hotel.guestRating / 10) * 45; // 0-45
  const starPart = (deal.hotel.stars / 5) * 15; // 0-15
  const pricePart = sp ? Math.max(0, Math.min(25, 12 - sp.deltaPct * 0.8)) : 12; // 0-25
  const comfort =
    (deal.outbound.stops === 0 ? 6 : 0) +
    (deal.freeCancellation ? 4 : 0) +
    (deal.board === "all-inclusive" ? 5 : deal.board === "room-only" ? 0 : 3);
  return Math.max(1, Math.min(100, Math.round(ratingPart + starPart + pricePart + comfort)));
}

/** Bullet reasons explaining the recommendation, all grounded in deal data. */
export function dealReasons(deal: Deal): string[] {
  const sp = smartPrice(deal);
  const out: string[] = [];
  if (sp) out.push(sp.detail);
  out.push(
    `${deal.hotel.name} — ${deal.hotel.stars}★ עם דירוג אורחים ${deal.hotel.guestRating} מתוך ${deal.hotel.reviewsCount.toLocaleString()} ביקורות`,
  );
  out.push(
    deal.outbound.stops === 0
      ? `טיסה ישירה עם ${deal.outbound.airline} (${Math.round(deal.outbound.durationMinutes / 60)} שעות)`
      : `טיסה עם ${deal.outbound.airline} ו-${deal.outbound.stops} עצירות`,
  );
  if (deal.freeCancellation) out.push("ביטול חינם — אפשר לשריין עכשיו ולהחליט אחר כך");
  out.push(`${deal.dates.nights} לילות · ${deal.destination.weather}`);
  return out;
}

/** Three headline amenities taken from the package inclusions. */
export function topAmenities(deal: Deal): string[] {
  return deal.includes.slice(0, 3);
}
