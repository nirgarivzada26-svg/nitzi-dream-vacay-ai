// Must-Not-Miss ("דיל שאי אפשר לפספס") — pure selection logic.
//
// Consumes CanonicalOffer[] only (from getActiveOffers()) — no listDeals(),
// no getDeal(), no I/O in this file at all. DEMO/SANDBOX/LIVE all flow
// through the exact same functions here; only the caller (must-not-
// miss.functions.ts) differs in whether it also revalidates before
// rendering.
//
// Missing/unknown data is NEVER treated as a negative signal — it simply
// contributes nothing to the score. Never fabricates savings, cancellation,
// direct-flight, rating, or board facts.

import { isFreeCancellation } from "@/lib/cancellation-policy";
import type { CanonicalOffer } from "@/lib/offers/canonical-offer";

/**
 * Before an offer can even be scored, it must be genuinely usable: not
 * unavailable, has a real positive price, and has real canonical/provider/
 * destination/hotel identity. Missing OPTIONAL data (rating, board,
 * cancellation, discount, flight) does NOT disqualify — only these
 * structural essentials do.
 */
export function isEligibleForMustNotMiss(offer: CanonicalOffer): boolean {
  if (offer.availabilityState === "unavailable") return false;
  if (offer.pricing.pricePerPerson === null || offer.pricing.pricePerPerson <= 0) return false;
  if (!offer.canonicalId || !offer.providerId || !offer.providerOfferId) return false;
  if (!offer.destination.slug || !offer.destination.city) return false;
  if (!offer.hotel.name) return false;
  return true;
}

/**
 * Small, pure, deterministic score from real evidence only. Every branch
 * requires the underlying field to be genuinely known — no branch fires on
 * an absence. A completely evidence-free offer scores 0, which is the
 * signal used downstream to decide "no Must-Not-Miss winner today."
 */
export function scoreMustNotMissOffer(offer: CanonicalOffer): number {
  let score = 0;
  if (offer.pricing.discountPct !== null && offer.pricing.discountPct > 0) {
    score += Math.min(20, offer.pricing.discountPct);
  }
  if (offer.hotel.guestRating !== null && offer.hotel.guestRating >= 8.5) score += 15;
  if (offer.nitziScore !== null) score += Math.round(offer.nitziScore / 5);
  if (
    offer.smartPrice &&
    (offer.smartPrice.level === "great" || offer.smartPrice.level === "good")
  ) {
    score += offer.smartPrice.level === "great" ? 15 : 8;
  }
  if (offer.flight && offer.flight.outbound.stops === 0 && offer.flight.inbound.stops === 0) {
    score += 10;
  }
  if (isFreeCancellation(offer.hotel.cancellationPolicy)) score += 8;
  if (offer.pricing.verified) score += 5;
  return score;
}

/**
 * The 1–2 strongest real reasons — never invented. Falls back to honest
 * neutral copy when no single dramatic signal exists on this offer.
 */
export function reasonsForMustNotMiss(offer: CanonicalOffer): string[] {
  const reasons: string[] = [];
  if (offer.pricing.discountPct !== null && offer.pricing.discountPct >= 10) {
    reasons.push("מחיר חזק ביחס למחיר הייחוס שנבדק");
  }
  if (offer.hotel.guestRating !== null && offer.hotel.guestRating >= 8.5) {
    reasons.push("מלון עם דירוג אורחים גבוה");
  }
  if (offer.flight && offer.flight.outbound.stops === 0 && offer.flight.inbound.stops === 0) {
    reasons.push("כולל טיסה ישירה");
  }
  if (isFreeCancellation(offer.hotel.cancellationPolicy)) {
    reasons.push("כולל ביטול חינם לפי תנאי ההצעה");
  }
  if (reasons.length === 0) reasons.push("הצעה בולטת מתוך המלאי שנבדק כרגע");
  return reasons.slice(0, 2);
}

export const MUST_NOT_MISS_ROTATION_HOURS = 24;

/**
 * Deterministic day-bucket selection. Scores every eligible offer, keeps
 * only offers with score > 0 (genuine positive evidence — never "the least
 * bad option"), takes the top-scoring cluster (within 80% of the best
 * score, so rotation has real candidates to choose among), and rotates
 * deterministically through that cluster by UTC day-bucket. Never random.
 *
 * Returns the full rotation-ordered candidate list (winner first, then
 * fallbacks in rotation order) so the caller can try the next candidate if
 * the first fails LIVE revalidation — never a random substitute.
 */
export function rankMustNotMissCandidates(
  offers: CanonicalOffer[],
  now: Date = new Date(),
  rotationHours: number = MUST_NOT_MISS_ROTATION_HOURS,
): CanonicalOffer[] {
  const eligible = offers.filter(isEligibleForMustNotMiss);
  const scored = eligible
    .map((offer) => ({ offer, score: scoreMustNotMissOffer(offer) }))
    .filter((s) => s.score > 0);

  if (scored.length === 0) return [];

  const topScore = Math.max(...scored.map((s) => s.score));
  const qualifying = scored
    .filter((s) => s.score >= topScore * 0.8)
    .sort((a, b) => b.score - a.score || a.offer.canonicalId.localeCompare(b.offer.canonicalId));

  const slotMs = rotationHours * 3600 * 1000;
  const slot = Math.floor(now.getTime() / slotMs);
  const startIndex = slot % qualifying.length;

  const ordered = [...qualifying.slice(startIndex), ...qualifying.slice(0, startIndex)];
  return ordered.map((s) => s.offer);
}
