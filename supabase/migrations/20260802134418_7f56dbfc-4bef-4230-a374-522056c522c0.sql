-- 1) Staff = explicit staff roles only, and only answerable about the caller.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select case
    when _user_id is null then false
    when auth.uid() is not null and _user_id <> auth.uid() then false
    else exists (
      select 1 from public.user_roles
      where user_id = _user_id
        and role in ('super_admin','admin','support','marketing','content_manager','finance')
    )
  end
$$;

-- 2) has_role may only be evaluated for the calling user.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select case
    when _user_id is null then false
    when auth.uid() is not null and _user_id <> auth.uid() then false
    else exists (
      select 1 from public.user_roles where user_id = _user_id and role = _role
    )
  end
$$;

-- 3) Internal/trigger-only SECURITY DEFINER functions are not callable from the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Role helpers stay callable only where RLS needs them.
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 4) Audit log is append-only via the trusted server; clients cannot write or tamper.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_audit_log FROM anon, authenticated;
REVOKE SELECT ON public.admin_audit_log FROM anon;
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

DROP POLICY IF EXISTS "no client writes to audit" ON public.admin_audit_log;
CREATE POLICY "no client writes to audit"
ON public.admin_audit_log
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (false);