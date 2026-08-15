// /packages sourcing — server function. Mirrors home-rails.functions.ts's
// pattern exactly: getActiveOffers() is called first (genuine canonical
// sourcing), and in DEMO mode the real catalog is then fed into the
// existing, unmodified listDeals()/groupDeals() pipeline so filter/sort/
// group/render behavior stays byte-for-byte identical to before this
// migration. DealCard.tsx rendering is out of scope this batch — SANDBOX/
// LIVE returns an explicit, honest empty state rather than a fabricated
// or fallback result.

import { createServerFn } from "@tanstack/react-start";
import { fetchDestinationRows } from "@/lib/catalog.server";
import { rowToDestination } from "@/lib/catalog";
import { listDeals } from "@/lib/deals";
import { getActiveOffers } from "@/lib/offers/active-offers.server";

export interface PackagesOffersResult {
  /** The real Deal[] pool for DEMO mode's existing filter/sort/group pipeline — untouched shape. */
  deals: ReturnType<typeof listDeals>;
  sourceMode: "demo" | "sandbox" | "live";
  emptyReason: string | null;
}

export const getPackagesOffers = createServerFn({ method: "GET" }).handler(
  async (): Promise<PackagesOffersResult> => {
    const active = await getActiveOffers();

    if (active.sourceMode !== "demo") {
      // Not a demo fallback: real offers may exist in `active.offers`, but
      // DealCard rendering for non-demo offers isn't built yet (out of
      // scope this batch) — same honest pattern as home-rails.functions.ts.
      return {
        deals: [],
        sourceMode: active.sourceMode,
        emptyReason:
          active.emptyReason ??
          "תצוגת החבילות עבור מצב זה עדיין לא זמינה — התהליך הפנימי כבר מחובר לספק האמיתי",
      };
    }

    const rows = await fetchDestinationRows();
    const catalog = rows.map(rowToDestination);
    const deals = listDeals(catalog, 3);

    return { deals, sourceMode: "demo", emptyReason: active.emptyReason };
  },
);
