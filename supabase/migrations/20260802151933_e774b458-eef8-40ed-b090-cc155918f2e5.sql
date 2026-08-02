CREATE TABLE IF NOT EXISTS public.app_error_log (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'app',
  message text not null,
  route text,
  context jsonb not null default '{}'::jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.app_error_log TO service_role;
GRANT SELECT ON public.app_error_log TO authenticated;
ALTER TABLE public.app_error_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read app errors" ON public.app_error_log;
CREATE POLICY "staff read app errors" ON public.app_error_log FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS app_error_log_created_idx ON public.app_error_log (created_at DESC);