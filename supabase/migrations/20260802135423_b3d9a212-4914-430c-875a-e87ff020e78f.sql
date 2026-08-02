-- 1) Duplicate-payment guard.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_idempotency_idx
  ON public.bookings (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2) Bookings are server-written only; clients may read their own.
DROP POLICY IF EXISTS "Users insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users read own bookings" ON public.bookings;
CREATE POLICY "Users read own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "no client writes to bookings" ON public.bookings;
CREATE POLICY "no client writes to bookings" ON public.bookings
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.bookings FROM anon, authenticated;
REVOKE SELECT ON public.bookings FROM anon;
GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- 3) Atomic first-admin bootstrap (no concurrent double-claim).
CREATE OR REPLACE FUNCTION private.claim_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE claimed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('nitzi_super_admin_bootstrap'));
  IF EXISTS (SELECT 1 FROM public.user_roles) THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  claimed := true;
  RETURN claimed;
END;
$$;
REVOKE ALL ON FUNCTION private.claim_super_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.claim_super_admin(uuid) TO service_role;

-- 4) Indexes for the hot list queries.
CREATE INDEX IF NOT EXISTS bookings_user_created_idx ON public.bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS search_history_user_created_idx ON public.search_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_trips_user_created_idx ON public.saved_trips (user_id, created_at DESC);