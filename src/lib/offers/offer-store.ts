// Transient offer store interface. A real Postgres-backed implementation
// now exists (offer-store.server.ts, this batch) — Supabase Postgres was
// chosen over Cloudflare KV/Durable Objects because this app's runtime
// (Cloudflare Workers, no KV/DO binding provisioned — confirmed by
// inspection) has no reliable module-level memory, and Postgres already
// has a proven TTL pattern in this exact codebase (ai_rate_limits).
//
// nullOfferStore remains available as an explicit "always miss" store —
// useful for tests and as a safe default if a caller ever needs one without
// touching the database.

import type { CanonicalOffer, TransientOfferSearchContext } from "./canonical-offer";
import type { StoredOffer } from "./offer-store-pure";

export interface TransientOfferStore {
  get(canonicalId: string): Promise<StoredOffer | null>;
  set(params: {
    offer: CanonicalOffer;
    searchContext: TransientOfferSearchContext;
    ttlSeconds: number;
  }): Promise<void>;
}

export const nullOfferStore: TransientOfferStore = {
  async get() {
    return null;
  },
  async set() {
    // no-op
  },
};
