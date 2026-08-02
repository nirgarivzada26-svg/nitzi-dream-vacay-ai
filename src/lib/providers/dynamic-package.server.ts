// Dynamic package pricing — server only.
//
// The client never sums prices. It sends component ids; this module rebuilds
// each component from provider data, applies the package discount rules and
// returns one verified total.

import type { DynamicPackage, DynamicPackageRequest, PackageComponentPrice } from "./contracts";
import { validateProduct } from "./contracts";
import type { VerifiedQuote } from "./verification";
import { unavailableQuote } from "./verification";
import { QUOTE_TTL_SECONDS } from "./config";
import { computeExtras } from "@/lib/booking-extras";

export const PACKAGE_BUNDLE_DISCOUNT = 0.07;
export const TRANSFERS_PER_PERSON = 120;
export const INSURANCE_PER_PERSON = 95;

export interface PricedComponentSource {
  flightQuote: VerifiedQuote | null;
  hotelQuote: VerifiedQuote | null;
}

function nightsBetween(a: string, b: string): number {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return d > 0 ? Math.round(d) : 1;
}

/**
 * Builds the package total from already-verified component quotes.
 * If any required component is unverified the whole package is unavailable.
 */
export function buildDynamicPackage(
  req: DynamicPackageRequest,
  source: PricedComponentSource,
): DynamicPackage {
  const people = Math.max(1, req.adults);
  const nights = nightsBetween(req.checkIn, req.checkOut);
  const components: PackageComponentPrice[] = [];
  const providerIds: string[] = [];

  const flightValid = req.flightOfferId ? validateProduct(source.flightQuote).valid : true;
  const hotelValid = req.hotelOfferId ? validateProduct(source.hotelQuote).valid : true;

  if (!flightValid || !hotelValid) {
    return {
      components: [],
      nights,
      people,
      perPerson: 0,
      total: 0,
      currency: "ILS",
      quote: unavailableQuote("nitzi-package", "אחד מרכיבי החבילה אינו זמין לאימות"),
      providerIds: [],
    };
  }

  if (req.flightOfferId && source.flightQuote?.perPerson) {
    components.push({
      id: "flight",
      label: "טיסות",
      perPerson: source.flightQuote.perPerson,
      perBooking: source.flightQuote.perPerson * people,
    });
    providerIds.push(source.flightQuote.source);
  }
  if (req.hotelOfferId && source.hotelQuote?.perPerson) {
    components.push({
      id: "hotel",
      label: "מלון",
      perPerson: source.hotelQuote.perPerson,
      perBooking: source.hotelQuote.perPerson * people,
    });
    providerIds.push(source.hotelQuote.source);
  }
  if (req.transfers) {
    components.push({
      id: "transfers",
      label: "העברות משדה התעופה",
      perPerson: TRANSFERS_PER_PERSON,
      perBooking: TRANSFERS_PER_PERSON * people,
    });
  }
  if (req.insurance) {
    components.push({
      id: "insurance",
      label: "ביטוח נסיעות",
      perPerson: INSURANCE_PER_PERSON,
      perBooking: INSURANCE_PER_PERSON * people,
    });
  }

  const { lines, total: extrasTotal } = computeExtras(
    req.extras as Parameters<typeof computeExtras>[0],
    people,
  );
  for (const line of lines) {
    components.push({
      id: line.id,
      label: line.label,
      perPerson: Math.round(line.total / people),
      perBooking: line.total,
    });
  }

  const gross = components.reduce((sum, c) => sum + c.perBooking, 0);
  const bundled = req.flightOfferId && req.hotelOfferId;
  const total = Math.round(bundled ? gross * (1 - PACKAGE_BUNDLE_DISCOUNT) : gross);
  const perPerson = Math.round(total / people);

  const quote: VerifiedQuote = {
    verified: components.length > 0,
    perPerson,
    total,
    currency: "ILS",
    verifiedAt: new Date().toISOString(),
    ttlSeconds: QUOTE_TTL_SECONDS,
    availability: components.length > 0 ? "available" : "unavailable",
    unitsLeft: null,
    source: providerIds[0] ?? "nitzi-package",
    reason: components.length > 0 ? null : "לא נבחרו רכיבים לחבילה",
  };

  return {
    components,
    nights,
    people,
    perPerson,
    total: total + (extrasTotal === 0 ? 0 : 0),
    currency: "ILS",
    quote,
    providerIds: Array.from(new Set(providerIds)),
  };
}
