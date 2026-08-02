ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS refund_status text;

CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  topic text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_select_own" ON public.support_requests;
CREATE POLICY "support_select_own" ON public.support_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "support_insert_own" ON public.support_requests;
CREATE POLICY "support_insert_own" ON public.support_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "support_staff_read" ON public.support_requests;
CREATE POLICY "support_staff_read" ON public.support_requests
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS support_requests_user_idx
  ON public.support_requests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id text NOT NULL,
  destination_name text NOT NULL,
  target_price integer NOT NULL CHECK (target_price > 0 AND target_price < 1000000),
  baseline_price integer NOT NULL CHECK (baseline_price > 0 AND baseline_price < 1000000),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, deal_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_alerts_own" ON public.price_alerts;
CREATE POLICY "price_alerts_own" ON public.price_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS price_alerts_user_idx
  ON public.price_alerts (user_id, created_at DESC);