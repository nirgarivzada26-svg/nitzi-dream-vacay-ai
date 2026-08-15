-- Durable provider offer store (Batch A of the LIVE offer resolution work).
--
-- Purpose: lets a SANDBOX/LIVE CanonicalOffer survive across Cloudflare
-- Worker requests (module-level memory is not reliable on this runtime —
-- verified in the Canonical Offer Layer batch) so a later batch can resolve
-- /deal/:id for a non-demo offer and revalidate it before booking.
--
-- This table is a SEARCH SNAPSHOT ONLY. A row existing (and not expired)
-- proves nothing about current price, availability, or cancellation terms —
-- it only proves "this offer was returned by a search at some point." The
-- next batch's provider revalidation step is what actually re-confirms
-- bookability. Do not treat a successful read of this table as
-- verification — see the code-level comments in offer-store.server.ts.
--
-- DEMO offers are never written here (source_mode excludes "demo" by a hard
-- CHECK constraint, not just app-level discipline).
--
-- Server-only: no anon/authenticated access at all, following the same
-- strict pattern already used for ai_rate_limits (REVOKE + RESTRICTIVE deny
-- policy), since offer snapshots aren't user-owned data the way bookings/
-- payments are and have no legitimate client-side read/write path.

CREATE TABLE public.provider_offer_cache (
  canonical_id text PRIMARY KEY,
  source_mode text NOT NULL CHECK (source_mode IN ('sandbox', 'live')),
  provider_id text NOT NULL,
  provider_offer_id text NOT NULL,
  -- Full CanonicalOffer snapshot as returned by the provider normalizer.
  offer jsonb NOT NULL,
  -- Enough server-side search context (destination/dates/occupancy/
  -- provider-side references) for a later revalidation call to re-derive a
  -- request without trusting anything the browser sends. Individual keys
  -- are null/absent when the current provider contract genuinely has no
  -- such field (see offer-store.server.ts) — never fabricated.
  search_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Mirrors CanonicalOffer.verifiedAt — when the PROVIDER last verified
  -- this offer, distinct from created_at (when WE stored it). Nullable:
  -- the active provider layer doesn't always supply this (see
  -- normalize-provider.ts).
  verified_at timestamptz,
  -- Explicit, required expiry. No implicit/default TTL at the database
  -- level — the application layer decides the value per §3 (provider TTL
  -- when one exists, a documented conservative default otherwise) and
  -- always supplies it explicitly on write.
  expires_at timestamptz NOT NULL
);

REVOKE ALL ON public.provider_offer_cache FROM anon, authenticated;
GRANT ALL ON public.provider_offer_cache TO service_role;
ALTER TABLE public.provider_offer_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access to provider_offer_cache" ON public.provider_offer_cache
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Supports the lazy/best-effort cleanup sweep (delete a bounded batch of
-- already-expired rows) without needing a full table scan.
CREATE INDEX provider_offer_cache_expires_idx ON public.provider_offer_cache (expires_at);
