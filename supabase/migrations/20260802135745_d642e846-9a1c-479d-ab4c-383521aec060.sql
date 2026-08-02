CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  identity text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);
REVOKE ALL ON public.ai_rate_limits FROM anon, authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access to ai_rate_limits" ON public.ai_rate_limits
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.ai_rate_limit_hit(_identity text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE cur public.ai_rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.ai_rate_limits (identity, window_start, hits)
  VALUES (_identity, now(), 1)
  ON CONFLICT (identity) DO UPDATE
    SET hits = CASE
          WHEN public.ai_rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN 1
          ELSE public.ai_rate_limits.hits + 1
        END,
        window_start = CASE
          WHEN public.ai_rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN now()
          ELSE public.ai_rate_limits.window_start
        END
  RETURNING * INTO cur;
  RETURN cur.hits <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.ai_rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_rate_limit_hit(text, integer, integer) TO service_role;