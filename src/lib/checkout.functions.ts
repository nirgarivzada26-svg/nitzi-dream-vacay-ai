// Checkout revalidation — server side.
//
// Runs immediately before payment. When a live provider is configured the
// quote is re-fetched from that provider; otherwise the deal is rebuilt from
// the managed catalog. The client never decides the price: it receives a
// status and must ask the user to approve any change before paying.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckoutRevalidationStatus = "verified" | "changed" | "sold-out" | "unavailable";

export interface CheckoutRevalidation {
  status: CheckoutRevalidationStatus;
  perPerson: number | null;
  total: number | null;
  previousPerPerson: number | null;
  previousTotal: number | null;
  people: number;
  currency: "ILS";
  verifiedAt: string | null;
  source: string;
  message: string | null;
}

export const revalidateCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ dealId: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<CheckoutRevalidation> => {
    const { fetchDestinationRows } = await import("@/lib/catalog.server");
    const { rowToDestination } = await import("@/lib/catalog");
    const { getDeal } = await import("@/lib/deals");
    const registry = await import("@/lib/providers/live-registry.server");

    const catalog = (await fetchDestinationRows()).map(rowToDestination);
    const deal = getDeal(data.dealId, catalog);
    if (!deal) {
      return {
        status: "unavailable",
        perPerson: null,
        total: null,
        previousPerPerson: null,
        previousTotal: null,
        people: 0,
        currency: "ILS",
        verifiedAt: null,
        source: "catalog",
        message: "הדיל אינו זמין יותר",
      };
    }

    const people = deal.people;
    const previousPerPerson = deal.price.perPerson;

    if (registry.liveMode()) {
      const res = await registry.revalidateLiveFlight(deal.id, {
        origin: "TLV",
        destinationCode: deal.destination.countryCode,
        destinationName: deal.destination.name,
        departDate: deal.dates.start.slice(0, 10),
        returnDate: deal.dates.end.slice(0, 10),
        adults: people,
        currency: "ILS",
      });
      if (!res.ok || !res.data.verified || res.data.perPerson === null) {
        return {
          status: res.ok && res.data.availability === "sold-out" ? "sold-out" : "unavailable",
          perPerson: null,
          total: null,
          previousPerPerson,
          previousTotal: previousPerPerson * people,
          people,
          currency: "ILS",
          verifiedAt: null,
          source: res.providerId,
          message: res.ok ? res.data.reason : res.error.message,
        };
      }
      const perPerson = res.data.perPerson;
      return {
        status: perPerson === previousPerPerson ? "verified" : "changed",
        perPerson,
        total: perPerson * people,
        previousPerPerson,
        previousTotal: previousPerPerson * people,
        people,
        currency: "ILS",
        verifiedAt: res.data.verifiedAt,
        source: res.providerId,
        message: null,
      };
    }

    // Demo mode: the catalog is the source of truth, so the quote is stable.
    return {
      status: deal.price.availability === "sold-out" ? "sold-out" : "verified",
      perPerson: previousPerPerson,
      total: previousPerPerson * people,
      previousPerPerson,
      previousTotal: previousPerPerson * people,
      people,
      currency: "ILS",
      verifiedAt: new Date().toISOString(),
      source: "nitzi-demo",
      message: null,
    };
  });
