CREATE OR REPLACE FUNCTION public.claim_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select private.claim_super_admin(_user_id)
$$;
REVOKE ALL ON FUNCTION public.claim_super_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_super_admin(uuid) TO service_role;