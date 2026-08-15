// Must-Not-Miss server function. DEMO/SANDBOX/LIVE all source candidates
// through getActiveOffers() and rank them via must-not-miss.ts's pure
// logic. The difference is entirely in what happens AFTER a winner is
// picked:
//
//  - DEMO: the picked CanonicalOffer is already a deterministic,
//    always-fresh normalization of a real Deal (getDeal() is pure) — no
//    revalidation needed, matching the same reasoning Secret Deal already
//    relies on.
//  - SANDBOX/LIVE: the durable offer-store TTL (Batch A: 600s) is far
//    shorter than the 24h rotation window, so a cached snapshot cannot be
//    trusted to still be accurate by the time it's actually rendered.
//    Every SANDBOX/LIVE render therefore calls resolveOffer() on the
//    rotation winner. If it's no longer available/price_changed, the next
//    candidate in the deterministic rotation order is tried — never a
//    random substitute, never a fabricated offer, never a demo fallback.

import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { rankMustNotMissCandidates, reasonsForMustNotMiss } from "@/lib/must-not-miss";
import { getActiveOffers } from "@/lib/offers/active-offers.server";
import { resolveOffer } from "@/lib/offers/resolve-offer.server";
import type { CanonicalOffer } from "@/lib/offers/canonical-offer";

export interface MustNotMissDeal {
  offer: CanonicalOffer;
  reasons: string[];
  /** True when this offer's price was just revalidated and differs from what rotation originally picked. */
  priceChanged: boolean;
}

export interface MustNotMissResult {
  deal: MustNotMissDeal | null;
  sourceMode: "demo" | "sandbox" | "live";
  emptyReason: string | null;
}

const MAX_REVALIDATION_ATTEMPTS = 5;
const EMPTY_COPY =
  "אנחנו בודקים עכשיו את ההצעות החזקות ביותר. דיל חדש יופיע כאן כשנמצא הצעה שעומדת בתנאים שלנו.";

async function computeMustNotMissDealImpl(): Promise<MustNotMissResult> {
  const active = await getActiveOffers();
  const candidates = rankMustNotMissCandidates(active.offers);

  if (candidates.length === 0) {
    return { deal: null, sourceMode: active.sourceMode, emptyReason: EMPTY_COPY };
  }

  if (active.sourceMode === "demo") {
    const winner = candidates[0];
    return {
      deal: { offer: winner, reasons: reasonsForMustNotMiss(winner), priceChanged: false },
      sourceMode: "demo",
      emptyReason: null,
    };
  }

  for (const candidate of candidates.slice(0, MAX_REVALIDATION_ATTEMPTS)) {
    const resolution = await resolveOffer(candidate.canonicalId);
    if (
      (resolution.status === "available" || resolution.status === "price_changed") &&
      resolution.refreshedOffer
    ) {
      const offer: CanonicalOffer = resolution.refreshedOffer;
      return {
        deal: {
          offer,
          reasons: reasonsForMustNotMiss(offer),
          priceChanged: resolution.status === "price_changed",
        },
        sourceMode: active.sourceMode,
        emptyReason: null,
      };
    }
  }

  return { deal: null, sourceMode: active.sourceMode, emptyReason: EMPTY_COPY };
}

export const computeMustNotMissDeal = computeMustNotMissDealImpl;

export const getMustNotMissDeal = createServerFn({ method: "GET" }).handler(
  computeMustNotMissDealImpl,
);

export const mustNotMissQueryOptions = queryOptions({
  queryKey: ["must-not-miss"],
  queryFn: () => getMustNotMissDeal(),
  staleTime: 5 * 60 * 1000,
});
