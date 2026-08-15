// Homepage rails — server function. This is the migrated sourcing path:
// rails are now built from getActiveOffers() (the canonical offer layer)
// rather than DealRails.tsx calling listDeals()/buildDealRails() directly
// against a client-fetched catalog.
//
// DEMO mode: getActiveOffers() is called (confirming sourcing genuinely
// flows through the canonical layer, and giving an authoritative
// sourceMode/emptyReason), and — since a demo CanonicalOffer is a 1:1
// normalization of a real Deal — the existing, unmodified, already
// extensively-tested buildDealRails()/dedup/backfill pipeline (Slice 2)
// still produces the actual rail output from the real catalog. This keeps
// homepage behavior byte-for-byte identical in DEMO mode while genuinely
// routing sourcing through getActiveOffers() first.
//
// SANDBOX/LIVE mode: getActiveOffers() returns real CanonicalOffer[], but
// DealCard.tsx/DealRails.tsx rendering (out of scope for this batch — only
// rail *sourcing* is being migrated) still expects Deal-shaped groups.
// Rather than fabricate a fake Deal from CanonicalOffer fields that don't
// fully map (board/cancellation are honestly "unknown" for live today —
// see normalize-provider.ts), this returns an empty rail set with an
// explicit reason. This is NOT a demo fallback — it's an honest "rendering
// for this mode isn't built yet" state, to be resolved when the rendering
// layer is migrated in a later batch.

import { createServerFn } from "@tanstack/react-start";
import { fetchDestinationRows } from "@/lib/catalog.server";
import { rowToDestination } from "@/lib/catalog";
import { buildDealRails, type DealRail } from "@/lib/deal-categories";
import { getSecretDeal } from "@/lib/deals";
import { getActiveOffers } from "@/lib/offers/active-offers.server";
import { rankMustNotMissCandidates } from "@/lib/must-not-miss";

export interface HomeRailsResult {
  rails: DealRail[];
  sourceMode: "demo" | "sandbox" | "live";
  emptyReason: string | null;
}

export const getHomeRails = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeRailsResult> => {
    const active = await getActiveOffers();

    if (active.sourceMode !== "demo") {
      // Structurally distinct from a demo fallback: real offers exist
      // (active.offers), we're just not rendering them yet in this batch.
      return {
        rails: [],
        sourceMode: active.sourceMode,
        emptyReason:
          active.emptyReason ??
          "תצוגת הבית עבור מצב זה עדיין לא זמינה — התהליך הפנימי כבר מחובר לספק האמיתי",
      };
    }

    const rows = await fetchDestinationRows();
    const catalog = rows.map(rowToDestination);

    // Same deterministic selection SecretDealCard makes independently on
    // the client — computed again here only to exclude it from the first
    // rail, matching the exact behavior in place before this migration.
    const secret = getSecretDeal(catalog);
    // Same deterministic selection getMustNotMissDeal() makes independently
    // (demo mode never needs revalidation, so this cheap re-computation is
    // exactly what that function would pick too) — excluded from the first
    // rail for the same "just saw this at the top of the page" reason.
    const mustNotMiss = rankMustNotMissCandidates(active.offers)[0];
    const excludeFromFirstRail = [
      secret?.deal.destination.slug,
      mustNotMiss?.destination.slug,
    ].filter((slug): slug is string => Boolean(slug));

    const rails = buildDealRails(catalog, { excludeFromFirstRail });

    return { rails, sourceMode: "demo", emptyReason: active.emptyReason };
  },
);
