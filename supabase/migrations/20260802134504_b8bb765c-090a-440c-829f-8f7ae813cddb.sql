CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
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

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
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

REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO anon, authenticated, service_role;

-- Recreate every policy against the private helpers (same access rules).
DROP POLICY IF EXISTS "staff read alerts" ON public.admin_alerts;
CREATE POLICY "staff read alerts" ON public.admin_alerts FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff resolve alerts" ON public.admin_alerts;
CREATE POLICY "staff resolve alerts" ON public.admin_alerts FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read audit" ON public.admin_audit_log;
CREATE POLICY "staff read audit" ON public.admin_audit_log FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read views" ON public.deal_views;
CREATE POLICY "staff read views" ON public.deal_views FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read permissions" ON public.role_permissions;
CREATE POLICY "staff read permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "super admin manage permissions" ON public.role_permissions;
CREATE POLICY "super admin manage permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin')) WITH CHECK (private.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "public settings readable" ON public.system_settings;
CREATE POLICY "public settings readable" ON public.system_settings FOR SELECT TO anon, authenticated
  USING (is_public OR private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read roles" ON public.user_roles;
CREATE POLICY "staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "super admin manage roles" ON public.user_roles;
CREATE POLICY "super admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'super_admin')) WITH CHECK (private.has_role(auth.uid(), 'super_admin'));

DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);