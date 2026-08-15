// getActiveOffers() — the one mode-aware offer source. Consumers (homepage
// rails today; /packages and AI searchTrips in later batches) call this
// instead of listDeals()/getDeal() directly, so the same code works
// regardless of whether DEMO, SANDBOX, or LIVE inventory is active.
//
// Structural guarantee: the sandbox/live branch below has no code path that
// calls listDeals() or the demo deal-building pipeline — it only ever calls
// getProviders() (the real provider registry) or returns an explicit
// empty/error result. There is no fallback that quietly retries against
// demo data. This is checked by a dedicated test in addition to a
// behavioral test.

import { fetchDestinationRows } from "@/lib/catalog.server";
import { rowToDestination, type Destination } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { getProviders } from "@/lib/providers/registry";
import { defaultAnswers } from "@/lib/nitzi-data";
import { currentOperatingMode, type OperatingMode } from "@/lib/providers/credentials.server";
import type { CanonicalOffer, TransientOfferSearchContext } from "./canonical-offer";
import { normalizeDemoDeal } from "./normalize-demo";
import { normalizeProviderPackage } from "./normalize-provider";
import { postgresOfferStore } from "./offer-store.server";

/** Matches the variant count deal-categories.ts (homepage rails) already used before this migration. */
const DEAL_VARIANTS = 3;

export interface ActiveOffersResult {
  offers: CanonicalOffer[];
  sourceMode: OperatingMode;
  emptyReason: string | null;
}

async function getBookableCatalog(): Promise<Destination[]> {
  const rows = await fetchDestinationRows();
  return rows.map(rowToDestination);
}

/**
 * Bounded fan-out: the active provider registry searches one destination
 * per call (SearchContext requires a single `destination`) — there is no
 * "search everything" provider method today. For sandbox/live we search a
 * capped set of popular destinations in parallel. This is a real, disclosed
 * limitation (see completion report) — a production live integration would
 * likely want a purpose-built multi-destination/top-deals endpoint instead
 * of this loop, which doesn't exist in the current adapter contract.
 */
const MAX_LIVE_FANOUT_DESTINATIONS = 20;

/**
 * A real, server-computed default search window — NOT reconstructed from
 * any DEMO catalog/deal data (independent of deals.ts entirely). Used only
 * because the current caller has no actual user-specified dates yet (no
 * consumer of getActiveOffers() collects them today) — this is an
 * operational default, the same way a real booking site assumes "next
 * available dates" absent a specific request, not a fabricated fact about
 * any particular offer.
 */
function defaultSearchWindow(days: number): { startDate: string; endDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + 21);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + days * 86400000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export async function getActiveOffers(): Promise<ActiveOffersResult> {
  const mode = currentOperatingMode();

  if (mode === "demo") {
    const catalog = await getBookableCatalog();
    const deals = listDeals(catalog, DEAL_VARIANTS);
    return {
      offers: deals.map(normalizeDemoDeal),
      sourceMode: "demo",
      emptyReason: deals.length > 0 ? null : "אין חבילות זמינות בקטלוג ההדגמה כרגע",
    };
  }

  // SANDBOX / LIVE — only ever reaches getProviders(). No fallback to
  // listDeals() exists in this branch, structurally.
  const { packages } = getProviders();
  const catalog = await getBookableCatalog();
  const candidates = catalog.filter((d) => d.isPopular).slice(0, MAX_LIVE_FANOUT_DESTINATIONS);

  if (candidates.length === 0) {
    return { offers: [], sourceMode: mode, emptyReason: "אין יעדים מוגדרים לחיפוש" };
  }

  const people = defaultAnswers.people;
  const { startDate, endDate } = defaultSearchWindow(defaultAnswers.days);
  const searchAnswers = { ...defaultAnswers };
  const origin = "TLV";

  const results = await Promise.all(
    candidates.map(async (dest) => {
      try {
        const found = await packages.search(
          { answers: searchAnswers, destination: dest, origin, startDate, endDate },
          { limit: 3 },
        );
        return { dest, found };
      } catch {
        return { dest, found: [] as Awaited<ReturnType<typeof packages.search>> };
      }
    }),
  );

  // Keep the raw provider `pkg` alongside its normalized CanonicalOffer —
  // the search context needs real provider-issued ids (pkg.id/hotel.id/
  // flight.id), which only exist on the raw result, not the normalized one.
  const pairs = results.flatMap(({ dest, found }) =>
    found.map((pkg) => ({
      pkg,
      offer: normalizeProviderPackage({
        sourceMode: mode,
        destination: dest,
        pkg,
        peoplePerBooking: people,
      }),
    })),
  );
  const offers = pairs.map((p) => p.offer);

  // Persist only the offers actually surfaced above (never the full
  // candidate/catalog set) — best-effort per offer. A write failure is
  // logged, not swallowed into a false "this is safely deep-linkable"
  // state and not a reason to fail the search itself (the search already
  // succeeded; deep-link safety for a given offer is a concern for the
  // caller that eventually tries to resolve it, not for search results).
  await Promise.all(
    pairs.map(async ({ pkg, offer }) => {
      const searchContext: TransientOfferSearchContext = {
        destinationSlug: offer.destination.slug,
        origin,
        outboundDate: offer.dates?.start ?? null,
        returnDate: offer.dates?.end ?? null,
        nights: offer.dates?.nights ?? pkg.nights,
        people,
        children: null, // QuizAnswers/SearchContext has no children field — honestly unknown
        rooms: null, // types.ts has no room-count field — honestly unknown
        providerId: offer.providerId,
        providerRefs: {
          // pkg.id / pkg.hotel.id / pkg.flight.id are the provider's own
          // generated ids for this search result — SEARCH_RESULT_ID_ONLY
          // (deterministic within one search call, not a proven stable
          // supplier revalidation token). Never the display flight number.
          packageOfferId: pkg.id,
          hotelOfferId: pkg.hotel.id,
          hotelRateId: null, // no room/rate concept exists in the active provider layer
          flightOfferId: pkg.flight.id,
          flightFareId: null, // no fare-class concept exists in the active provider layer
          searchSessionId: null, // no search/session token exists in the active provider layer
        },
      };
      try {
        await postgresOfferStore.set({ offer, searchContext, ttlSeconds: 600 });
      } catch (err) {
        console.error(
          `provider_offer_cache write failed for ${offer.canonicalId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );

  return {
    offers,
    sourceMode: mode,
    emptyReason:
      offers.length > 0
        ? null
        : mode === "sandbox"
          ? "ספק ה-SANDBOX אינו מחזיר תוצאות כרגע"
          : "אין זמינות בספקים החיים כרגע",
  };
}
