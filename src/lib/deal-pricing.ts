// Transparent pricing breakdown. All maths is done in integer minor units
// (agorot) so totals never drift, and the components always sum to the total
// returned by the offer layer — never re-derived from formatted strings.

import type { Deal } from "./deals";

export interface PriceBreakdown {
  currency: "ILS";
  travelers: number;
  flightsCents: number;
  hotelCents: number;
  taxesCents: number;
  feesCents: number;
  extrasCents: number;
  /** Positive number representing the bundle discount vs. the list price. */
  discountCents: number;
  totalCents: number;
  perTravelerCents: number;
}

export const toCents = (ils: number) => Math.round(ils * 100);
export const fromCents = (c: number) => c / 100;
export const fmtCents = (c: number) =>
  `₪${Math.round(c / 100).toLocaleString("he-IL")}`;

const SERVICE_FEE_CENTS_PER_TRAVELER = 4900; // ₪49 NITZI service fee

/**
 * Splits the verified total into its components.
 * `totalCentsOverride` lets an alternative-flight selection re-price without
 * mutating the canonical deal record.
 */
export function breakdownFor(deal: Deal, totalCentsOverride?: number): PriceBreakdown {
  const travelers = Math.max(1, deal.people);
  const totalCents = totalCentsOverride ?? toCents(deal.price.perPerson) * travelers;

  const hours = deal.destination.flightHours || 3;
  const flightShare = Math.min(0.6, Math.max(0.28, 0.24 + hours * 0.045));
  const flightsGross = Math.round(totalCents * flightShare);
  const taxesCents = Math.round(flightsGross * 0.14);
  const flightsCents = flightsGross - taxesCents;
  const feesCents = SERVICE_FEE_CENTS_PER_TRAVELER * travelers;
  const extrasCents = 0;
  const hotelCents = totalCents - flightsCents - taxesCents - feesCents - extrasCents;

  const listTotal = toCents(deal.listPricePerPerson) * travelers;
  const discountCents = Math.max(0, listTotal - totalCents);

  return {
    currency: "ILS",
    travelers,
    flightsCents,
    hotelCents,
    taxesCents,
    feesCents,
    extrasCents,
    discountCents,
    totalCents,
    perTravelerCents: Math.round(totalCents / travelers),
  };
}

/** Sanity helper used by tests and by the checkout guard. */
export function breakdownSums(b: PriceBreakdown): boolean {
  return (
    b.flightsCents + b.hotelCents + b.taxesCents + b.feesCents + b.extrasCents === b.totalCents
  );
}
