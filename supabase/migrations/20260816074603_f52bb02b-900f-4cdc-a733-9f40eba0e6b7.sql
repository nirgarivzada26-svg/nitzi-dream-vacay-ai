CREATE TABLE IF NOT EXISTS public.provider_offer_cache (
  canonical_id text PRIMARY KEY,
  source_mode text NOT NULL CHECK (source_mode IN ('sandbox','live')),
  provider_id text NOT NULL,
  provider_offer_id text NOT NULL,
  offer jsonb NOT NULL,
  search_context jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz NOT NULL
);

GRANT ALL ON public.provider_offer_cache TO service_role;
ALTER TABLE public.provider_offer_cache ENABLE ROW LEVEL SECURITY;