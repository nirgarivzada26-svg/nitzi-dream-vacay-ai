
drop policy "anyone can record a view" on public.deal_views;
create policy "record own view" on public.deal_views for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_staff(uuid) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
