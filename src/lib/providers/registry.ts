// Central registry — the ONLY place that decides which supplier answers.
// UI, routes and the booking flow never import a provider directly.

import type { FlightProvider, HotelProvider, PackageProvider, SearchContext } from "./types";
import { demoFlightProvider, demoHotelProvider, demoPackageProvider } from "./demo";
import { DEMO_MODE, PROVIDER_ID } from "./config";
import type { FlightOffer, VerifiedQuote } from "./verification";
import { unavailableQuote } from "./verification";

/** Live adapters register here (Amadeus / Booking / Hotelbeds / …). */
const liveProviders: {
  hotels?: HotelProvider;
  flights?: FlightProvider;
  packages?: PackageProvider;
} = {};

/** No live adapter yet -> report unavailable rather than invent data. */
function notConfigured<T>(kind: string): { id: string; search(): Promise<T[]> } {
  return {
    id: "unconfigured",
    async search() {
      console.warn(`[nitzi] no live ${kind} provider configured (DEMO_MODE=false)`);
      return [];
    },
  };
}

export function getProviders(): {
  hotels: HotelProvider;
  flights: FlightProvider;
  packages: PackageProvider;
} {
  if (DEMO_MODE) {
    return { hotels: demoHotelProvider, flights: demoFlightProvider, packages: demoPackageProvider };
  }
  return {
    hotels: liveProviders.hotels ?? (notConfigured("hotel") as unknown as HotelProvider),
    flights: liveProviders.flights ?? (notConfigured("flight") as unknown as FlightProvider),
    packages: liveProviders.packages ?? (notConfigured("package") as unknown as PackageProvider),
  };
}

/** Rich, fully-detailed flight offers with a verified quote on each. */
export async function searchFlightOffers(
  ctx: SearchContext,
  opts?: { limit?: number },
): Promise<FlightOffer[]> {
  if (!DEMO_MODE) return [];
  return demoFlightProvider.searchOffers(ctx, opts);
}

/** Re-verifies an offer with the provider right before it is displayed/booked. */
export async function verifyFlightOffer(offerId: string, ctx: SearchContext): Promise<VerifiedQuote> {
  if (!DEMO_MODE) return unavailableQuote("unconfigured", "לא הוגדר ספק חי");
  return demoFlightProvider.verify(offerId, ctx);
}

export { DEMO_MODE, PROVIDER_ID };
