
create type public.app_role as enum ('super_admin','admin','support','marketing','content_manager','finance');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "staff read roles" on public.user_roles for select to authenticated
  using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "super admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  permission text not null,
  allowed boolean not null default true,
  unique (role, permission)
);
grant select on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;
alter table public.role_permissions enable row level security;
create policy "staff read permissions" on public.role_permissions for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "super admin manage permissions" on public.role_permissions for all to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

insert into public.role_permissions (role, permission, allowed) values
  ('super_admin','dashboard',true),('super_admin','orders',true),('super_admin','users',true),('super_admin','packages',true),('super_admin','flights',true),('super_admin','settings',true),('super_admin','audit',true),('super_admin','reports',true),('super_admin','permissions',true),('super_admin','analytics',true),('super_admin','notifications',true),
  ('admin','dashboard',true),('admin','orders',true),('admin','users',true),('admin','packages',true),('admin','flights',true),('admin','settings',true),('admin','audit',true),('admin','reports',true),('admin','permissions',false),('admin','analytics',true),('admin','notifications',true),
  ('support','dashboard',true),('support','orders',true),('support','users',true),('support','packages',false),('support','flights',false),('support','settings',false),('support','audit',false),('support','reports',false),('support','permissions',false),('support','analytics',false),('support','notifications',true),
  ('marketing','dashboard',true),('marketing','orders',false),('marketing','users',false),('marketing','packages',true),('marketing','flights',false),('marketing','settings',false),('marketing','audit',false),('marketing','reports',true),('marketing','permissions',false),('marketing','analytics',true),('marketing','notifications',false),
  ('content_manager','dashboard',true),('content_manager','orders',false),('content_manager','users',false),('content_manager','packages',true),('content_manager','flights',true),('content_manager','settings',true),('content_manager','audit',false),('content_manager','reports',false),('content_manager','permissions',false),('content_manager','analytics',true),('content_manager','notifications',false),
  ('finance','dashboard',true),('finance','orders',true),('finance','users',false),('finance','packages',false),('finance','flights',false),('finance','settings',false),('finance','audit',true),('finance','reports',true),('finance','permissions',false),('finance','analytics',false),('finance','notifications',true);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  resource text not null,
  resource_id text,
  previous_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;
alter table public.admin_audit_log enable row level security;
create policy "staff read audit" on public.admin_audit_log for select to authenticated
  using (public.is_staff(auth.uid()));

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
grant select on public.system_settings to authenticated;
grant select on public.system_settings to anon;
grant all on public.system_settings to service_role;
alter table public.system_settings enable row level security;
create policy "public settings readable" on public.system_settings for select to anon, authenticated
  using (is_public or public.is_staff(auth.uid()));

insert into public.system_settings (key, value, is_public) values
  ('default_airport', '"TLV"'::jsonb, true),
  ('currencies', '["ILS","USD","EUR"]'::jsonb, true),
  ('languages', '["he","en"]'::jsonb, true),
  ('commission_pct', '8'::jsonb, false),
  ('featured_deal_slugs', '[]'::jsonb, true),
  ('email_templates', '{"booking_confirmation":"","price_alert":""}'::jsonb, false),
  ('notification_settings', '{"provider_sync":true,"payment_failed":true,"no_results":true}'::jsonb, false);

create table public.deal_views (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null,
  destination_slug text,
  destination_name text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index deal_views_created_idx on public.deal_views (created_at desc);
create index deal_views_deal_idx on public.deal_views (deal_id);
grant insert on public.deal_views to anon, authenticated;
grant select on public.deal_views to authenticated;
grant all on public.deal_views to service_role;
alter table public.deal_views enable row level security;
create policy "anyone can record a view" on public.deal_views for insert to anon, authenticated with check (true);
create policy "staff read views" on public.deal_views for select to authenticated using (public.is_staff(auth.uid()));

create table public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null default 'warning',
  message text not null,
  context jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index admin_alerts_created_idx on public.admin_alerts (created_at desc);
grant select, update on public.admin_alerts to authenticated;
grant all on public.admin_alerts to service_role;
alter table public.admin_alerts enable row level security;
create policy "staff read alerts" on public.admin_alerts for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff resolve alerts" on public.admin_alerts for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
