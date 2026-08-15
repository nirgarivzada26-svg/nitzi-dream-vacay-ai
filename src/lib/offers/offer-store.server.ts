// Real Postgres-backed TransientOfferStore — server-only (imports
// supabaseAdmin, the service-role client; never import this from client code).
//
// This is transport only. All TTL/validation/serialization logic lives in
// offer-store-pure.ts and is exercised identically here — this file's only
// job is turning that into actual reads/writes against
// public.provider_offer_cache (service-role-only table, no anon/authenticated
// access — see the migration).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CanonicalOffer, TransientOfferSearchContext } from "./canonical-offer";
import {
  DEFAULT_OFFER_TTL_SECONDS,
  deserializeOfferRow,
  serializeOfferRow,
  type ProviderOfferCacheRow,
  type StoredOffer,
} from "./offer-store-pure";
import type { TransientOfferStore } from "./offer-store";

/**
 * Reads the raw row, bypassing expiry filtering — needed by resolveOffer()
 * to distinguish "never existed" (not_found) from "existed but expired"
 * (expired), which the plain get() above deliberately collapses into a
 * single "miss" for simpler callers that don't need the distinction.
 */
export async function getRawOfferRow(canonicalId: string): Promise<ProviderOfferCacheRow | null> {
  const { data, error } = await supabaseAdmin
    .from("provider_offer_cache")
    .select("*")
    .eq("canonical_id", canonicalId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProviderOfferCacheRow;
}

export const postgresOfferStore: TransientOfferStore = {
  async get(canonicalId: string): Promise<StoredOffer | null> {
    const { data, error } = await supabaseAdmin
      .from("provider_offer_cache")
      .select("*")
      .eq("canonical_id", canonicalId)
      .maybeSingle();

    if (error || !data) return null; // a DB error is a miss, never a false hit
    return deserializeOfferRow(data as ProviderOfferCacheRow);
  },

  async set(params: {
    offer: CanonicalOffer;
    searchContext: TransientOfferSearchContext;
    ttlSeconds?: number;
  }): Promise<void> {
    const row = serializeOfferRow({
      offer: params.offer,
      searchContext: params.searchContext,
      ttlSeconds: params.ttlSeconds ?? DEFAULT_OFFER_TTL_SECONDS,
    });

    // Upsert: a fresh search for the same offer replaces the old snapshot
    // and extends its expiry. Errors are surfaced, never swallowed — the
    // caller decides what "persistence failed" means for its own context.
    const { error } = await supabaseAdmin
      .from("provider_offer_cache")
      .upsert(row as never, { onConflict: "canonical_id" });
    if (error) {
      throw new Error(
        `failed to persist provider offer ${params.offer.canonicalId}: ${error.message}`,
      );
    }
  },
};
