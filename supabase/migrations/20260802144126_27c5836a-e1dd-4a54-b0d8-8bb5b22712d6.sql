CREATE TABLE public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_kind text not null,
  provider_id text not null,
  operation text not null,
  ok boolean not null,
  latency_ms integer not null default 0,
  error_code text,
  error_message text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.provider_events TO authenticated;
GRANT ALL ON public.provider_events TO service_role;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read provider events" ON public.provider_events FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE INDEX provider_events_created_idx ON public.provider_events (created_at DESC);
CREATE INDEX provider_events_kind_idx ON public.provider_events (provider_kind, provider_id, created_at DESC);

CREATE TABLE public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider_id text not null,
  operation text not null,
  status text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'ILS',
  provider_reference text,
  idempotency_key text not null,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, idempotency_key)
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payment transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_staff(auth.uid()));
CREATE INDEX payment_transactions_booking_idx ON public.payment_transactions (booking_id, created_at DESC);
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  event_type text not null,
  external_id text not null,
  verified boolean not null default false,
  processed boolean not null default false,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider_id, external_id)
);
GRANT SELECT ON public.provider_webhook_events TO authenticated;
GRANT ALL ON public.provider_webhook_events TO service_role;
ALTER TABLE public.provider_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read webhook events" ON public.provider_webhook_events FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE INDEX provider_webhook_events_created_idx ON public.provider_webhook_events (created_at DESC);

CREATE TABLE public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  channel text not null,
  template text not null,
  recipient text not null,
  provider_id text not null,
  status text not null,
  error_message text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notification_log FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_staff(auth.uid()));
CREATE INDEX notification_log_created_idx ON public.notification_log (created_at DESC);