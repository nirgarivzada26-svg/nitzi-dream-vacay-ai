// Admin data layer. Server-only: every export assumes it runs inside a
// server function handler that has already authenticated the caller.
//
// Rule: nothing here invents data. Every number is aggregated from real rows
// in the database (bookings, favorites, search_history, deal_views,
// destinations, auth users). When there is no data, we return empty arrays and
// the UI renders an explicit empty state.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rowToDestination, type Destination } from "./catalog";
import { listDeals, type Deal } from "./deals";
import { smartPrice } from "./smart-price";
import type {
  AdminAlert, AdminFlightRow, AdminOrder, AdminOverview, AdminPackageRow, AdminPermission,
  AdminRole, AdminUserRow, AuditRow, DayPoint, NamedCount, Paged, SearchAnalytics, SettingRow,
} from "./admin-types";

/* ------------------------------------------------------------------ auth */

export class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}

type AuthedClient = { from: (t: never) => unknown };

export async function rolesOf(userId: string): Promise<AdminRole[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new AdminError(error.message);
  return (data ?? []).map((r) => r.role as AdminRole);
}

export async function permissionsOf(roles: AdminRole[]): Promise<AdminPermission[]> {
  if (roles.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("role_permissions")
    .select("role, permission, allowed")
    .in("role", roles)
    .eq("allowed", true);
  if (error) throw new AdminError(error.message);
  return Array.from(new Set((data ?? []).map((r) => r.permission))) as AdminPermission[];
}

export async function staffCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (error) throw new AdminError(error.message);
  return count ?? 0;
}

/** Throws unless the caller holds the given permission. */
export async function requirePermission(
  userId: string,
  permission: AdminPermission,
): Promise<AdminRole[]> {
  const roles = await rolesOf(userId);
  if (roles.length === 0) throw new AdminError("אין לך הרשאת ניהול");
  const perms = await permissionsOf(roles);
  if (!perms.includes(permission)) throw new AdminError("אין לך הרשאה לאזור הזה");
  return roles;
}

export async function logAudit(input: {
  actorId: string;
  actorEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: input.actorId,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    resource: input.resource,
    resource_id: input.resourceId ?? null,
    previous_value: (input.previousValue ?? null) as never,
    new_value: (input.newValue ?? null) as never,
    ip_address: input.ip ?? null,
  });
}

/* -------------------------------------------------------------- helpers */

const dayKey = (iso: string) => iso.slice(0, 10);
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

function tally(items: (string | null | undefined)[]): NamedCount[] {
  const m = new Map<string, number>();
  for (const i of items) {
    if (!i) continue;
    m.set(i, (m.get(i) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export async function loadCatalog(): Promise<Destination[]> {
  const { data, error } = await supabaseAdmin
    .from("destinations")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new AdminError(error.message);
  return (data ?? []).map((r) => rowToDestination(r as never));
}

async function authUsers() {
  const out: { id: string; email: string | null; phone: string | null; created_at: string; banned: boolean }[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new AdminError(error.message);
    for (const u of data.users) {
      const banned = Boolean((u as unknown as { banned_until?: string | null }).banned_until);
      out.push({ id: u.id, email: u.email ?? null, phone: u.phone ?? null, created_at: u.created_at, banned });
    }
    if (data.users.length < 200) break;
  }
  return out;
}

interface BookingRecord {
  id: string; user_id: string; deal_id: string; destination_name: string;
  people: number; nights: number; total_price: number | string; currency: string;
  status: string; start_date: string; end_date: string; created_at: string;
  snapshot: unknown;
}

async function allBookings(): Promise<BookingRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id,user_id,deal_id,destination_name,people,nights,total_price,currency,status,start_date,end_date,created_at,snapshot")
    .order("created_at", { ascending: false });
  if (error) throw new AdminError(error.message);
  return (data ?? []) as unknown as BookingRecord[];
}

function paymentMethodOf(snapshot: unknown): string | null {
  const s = snapshot as { booking?: { payment?: { method?: string } } } | null;
  return s?.booking?.payment?.method ?? null;
}

async function nameMap(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from("profiles").select("id, display_name");
  const m = new Map<string, string>();
  for (const p of data ?? []) if (p.display_name) m.set(p.id, p.display_name);
  return m;
}

function toOrder(b: BookingRecord, names: Map<string, string>, emails: Map<string, string | null>): AdminOrder {
  return {
    id: b.id,
    userId: b.user_id,
    customer: names.get(b.user_id) ?? (emails.get(b.user_id)?.split("@")[0] ?? "—"),
    email: emails.get(b.user_id) ?? null,
    destination: b.destination_name,
    dealId: b.deal_id,
    people: b.people,
    nights: b.nights,
    total: Number(b.total_price),
    currency: b.currency,
    status: b.status,
    paymentMethod: paymentMethodOf(b.snapshot),
    startDate: b.start_date,
    endDate: b.end_date,
    createdAt: b.created_at,
  };
}

/* ------------------------------------------------------------- overview */

export async function buildOverview(): Promise<AdminOverview> {
  const [bookings, users, names, viewsRes, searchRes, favRes] = await Promise.all([
    allBookings(),
    authUsers(),
    nameMap(),
    supabaseAdmin.from("deal_views").select("deal_id, destination_name, created_at").gte("created_at", daysAgo(30).toISOString()),
    supabaseAdmin.from("search_history").select("id, user_id, created_at").gte("created_at", daysAgo(30).toISOString()),
    supabaseAdmin.from("favorites").select("user_id"),
  ]);

  const emails = new Map(users.map((u) => [u.id, u.email] as const));
  const paid = bookings.filter((b) => b.status !== "cancelled" && b.status !== "refunded");
  const sum = (rows: BookingRecord[]) => rows.reduce((a, b) => a + Number(b.total_price), 0);

  const todayISO = startOfDay().toISOString();
  const weekISO = daysAgo(7).toISOString();
  const monthISO = daysAgo(30).toISOString();

  const byDayMap = new Map<string, DayPoint>();
  for (let i = 13; i >= 0; i--) {
    const key = dayKey(daysAgo(i).toISOString());
    byDayMap.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const b of paid) {
    const key = dayKey(b.created_at);
    const p = byDayMap.get(key);
    if (p) { p.revenue += Number(b.total_price); p.orders += 1; }
  }

  const searches = searchRes.data ?? [];
  const views = viewsRes.data ?? [];

  const activeUserIds = new Set<string>();
  for (const s of searches) if (s.user_id) activeUserIds.add(s.user_id);
  for (const b of bookings) if (b.created_at >= monthISO) activeUserIds.add(b.user_id);
  for (const f of favRes.data ?? []) if (f.user_id) activeUserIds.add(f.user_id);

  const dealName = new Map<string, string>();
  for (const b of bookings) dealName.set(b.deal_id, b.destination_name);
  for (const v of views) if (v.destination_name) dealName.set(v.deal_id, v.destination_name);

  const revenueByDeal = new Map<string, { orders: number; revenue: number }>();
  for (const b of paid) {
    const cur = revenueByDeal.get(b.deal_id) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(b.total_price);
    revenueByDeal.set(b.deal_id, cur);
  }

  const revenueByDest = new Map<string, { orders: number; revenue: number }>();
  for (const b of paid) {
    const cur = revenueByDest.get(b.destination_name) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(b.total_price);
    revenueByDest.set(b.destination_name, cur);
  }

  const ordersByUser = new Map<string, { count: number; spend: number }>();
  for (const b of paid) {
    const cur = ordersByUser.get(b.user_id) ?? { count: 0, spend: 0 };
    cur.count += 1;
    cur.spend += Number(b.total_price);
    ordersByUser.set(b.user_id, cur);
  }
  const favByUser = new Map<string, number>();
  for (const f of favRes.data ?? []) if (f.user_id) favByUser.set(f.user_id, (favByUser.get(f.user_id) ?? 0) + 1);

  const roleRows = await supabaseAdmin.from("user_roles").select("user_id, role");
  const rolesByUser = new Map<string, AdminRole[]>();
  for (const r of roleRows.data ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role as AdminRole);
    rolesByUser.set(r.user_id, list);
  }

  const latestUsers: AdminUserRow[] = [...users]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8)
    .map((u) => ({
      id: u.id,
      name: names.get(u.id) ?? (u.email?.split("@")[0] ?? "—"),
      email: u.email,
      phone: u.phone,
      createdAt: u.created_at,
      orders: ordersByUser.get(u.id)?.count ?? 0,
      favorites: favByUser.get(u.id) ?? 0,
      spend: ordersByUser.get(u.id)?.spend ?? 0,
      roles: rolesByUser.get(u.id) ?? [],
      active: !u.banned,
    }));

  const totalRevenue = sum(paid);

  return {
    revenueToday: sum(paid.filter((b) => b.created_at >= todayISO)),
    revenueWeek: sum(paid.filter((b) => b.created_at >= weekISO)),
    revenueMonth: sum(paid.filter((b) => b.created_at >= monthISO)),
    totalOrders: bookings.length,
    averageOrderValue: paid.length ? Math.round(totalRevenue / paid.length) : 0,
    conversionRate: searches.length ? Number(((paid.filter((b) => b.created_at >= monthISO).length / searches.length) * 100).toFixed(1)) : 0,
    activeUsers: activeUserIds.size,
    newUsersToday: users.filter((u) => u.created_at >= todayISO).length,
    byDay: [...byDayMap.values()],
    topDestinations: [...revenueByDest.entries()]
      .map(([label, v]) => ({ label, value: v.orders, secondary: v.revenue }))
      .sort((a, b) => b.value - a.value).slice(0, 8),
    topPackages: [...revenueByDeal.entries()]
      .map(([id, v]) => ({ label: dealName.get(id) ?? id, value: v.orders, secondary: v.revenue }))
      .sort((a, b) => b.value - a.value).slice(0, 8),
    mostViewed: tally(views.map((v) => v.destination_name ?? v.deal_id)).slice(0, 8),
    latestOrders: bookings.slice(0, 10).map((b) => toOrder(b, names, emails)),
    latestUsers,
  };
}

/* ------------------------------------------------------ search analytics */

interface SearchRow { id: string; answers: Record<string, unknown> | null; destination_name: string | null; created_at: string }

export async function buildSearchAnalytics(): Promise<SearchAnalytics> {
  const { data, error } = await supabaseAdmin
    .from("search_history")
    .select("id, answers, destination_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new AdminError(error.message);
  const rows = (data ?? []) as unknown as SearchRow[];

  const months = rows.map((r) => {
    const d = new Date(r.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const budgets = rows.map((r) => {
    const b = Number(r.answers?.["budget"] ?? 0);
    if (!b) return null;
    const bucket = Math.floor(b / 2000) * 2000;
    return `${bucket.toLocaleString("he-IL")}–${(bucket + 2000).toLocaleString("he-IL")} ₪`;
  });

  const airports = rows.map((r) => {
    const o = r.answers?.["origin"];
    return typeof o === "string" && o.trim() ? o.trim().toUpperCase() : null;
  });

  const noResults = rows.filter((r) => !r.destination_name);

  return {
    totalSearches: rows.length,
    topDestinations: tally(rows.map((r) => r.destination_name)).slice(0, 12),
    noResults: tally(noResults.map((r) => {
      const q = r.answers?.["destination"];
      return typeof q === "string" && q.trim() ? q.trim() : "חיפוש ללא יעד מוגדר";
    })).slice(0, 12),
    noResultsCount: noResults.length,
    popularMonths: tally(months).slice(0, 12),
    popularBudgets: tally(budgets).slice(0, 8),
    popularAirports: tally(airports).slice(0, 8),
  };
}

/* -------------------------------------------------------------- packages */

export async function buildPackages(): Promise<AdminPackageRow[]> {
  const [catalog, viewsRes, bookings, settings] = await Promise.all([
    loadCatalog(),
    supabaseAdmin.from("deal_views").select("deal_id"),
    allBookings(),
    supabaseAdmin.from("system_settings").select("key, value").eq("key", "featured_deal_slugs").maybeSingle(),
  ]);

  const featured = new Set(((settings.data?.value as string[] | null) ?? []).map(String));
  const viewsBy = new Map<string, number>();
  for (const v of viewsRes.data ?? []) viewsBy.set(v.deal_id, (viewsBy.get(v.deal_id) ?? 0) + 1);
  const ordersBy = new Map<string, number>();
  for (const b of bookings) ordersBy.set(b.deal_id, (ordersBy.get(b.deal_id) ?? 0) + 1);

  const deals = new Map<string, Deal>();
  for (const d of listDeals(catalog, 1)) deals.set(d.destination.slug, d);

  return catalog.map((dest) => {
    const deal = deals.get(dest.slug) ?? null;
    const views = viewsBy.get(dest.slug) ?? 0;
    const orders = ordersBy.get(dest.slug) ?? 0;
    const verdict = deal ? smartPrice(deal) : null;
    return {
      slug: dest.slug,
      name: deal?.title ?? dest.name,
      destination: dest.name,
      country: dest.country,
      hotel: deal?.hotel.name ?? null,
      price: deal?.price.perPerson ?? 0,
      previousPrice: deal?.listPricePerPerson ?? null,
      stars: deal?.hotel.stars ?? null,
      board: deal?.board ?? null,
      pool: Boolean(deal?.hotel.note?.includes("בריכ")),
      beachDistance: deal?.hotel.note?.match(/\d+\s*(מ'|מטר|דק)/)?.[0] ?? null,
      active: dest.hasOffers,
      hasOffers: dest.hasOffers,
      nitziScore: deal ? Math.round(deal.hotel.guestRating * 10) : 0,
      smartPrice: verdict ? (verdict.level === "normal" ? "fair" : verdict.level) : "unknown",
      views,
      orders,
      conversionRate: views ? Number(((orders / views) * 100).toFixed(1)) : 0,
      featured: featured.has(dest.slug),
    } satisfies AdminPackageRow;
  });
}

export async function setDestinationActive(slugs: string[], active: boolean) {
  const { error } = await supabaseAdmin.from("destinations").update({ is_active: active, has_offers: active }).in("slug", slugs);
  if (error) throw new AdminError(error.message);
}

export async function updateDestination(slug: string, patch: Record<string, unknown>) {
  const { data: before } = await supabaseAdmin.from("destinations").select("*").eq("slug", slug).maybeSingle();
  const { error } = await supabaseAdmin.from("destinations").update(patch as never).eq("slug", slug);
  if (error) throw new AdminError(error.message);
  return before;
}

export async function duplicateDestination(slug: string) {
  const { data, error } = await supabaseAdmin.from("destinations").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new AdminError(error.message);
  if (!data) throw new AdminError("היעד לא נמצא");
  const copy = { ...(data as Record<string, unknown>) };
  let newSlug = `${slug}-copy`;
  for (let i = 2; ; i++) {
    const { data: exists } = await supabaseAdmin.from("destinations").select("slug").eq("slug", newSlug).maybeSingle();
    if (!exists) break;
    newSlug = `${slug}-copy-${i}`;
  }
  copy["slug"] = newSlug;
  copy["name"] = `${copy["name"]} (עותק)`;
  copy["is_active"] = false;
  copy["has_offers"] = false;
  delete copy["created_at"];
  delete copy["updated_at"];
  const { error: insErr } = await supabaseAdmin.from("destinations").insert(copy as never);
  if (insErr) throw new AdminError(insErr.message);
  return newSlug;
}

export async function deleteDestination(slug: string) {
  const { error } = await supabaseAdmin.from("destinations").delete().eq("slug", slug);
  if (error) throw new AdminError(error.message);
}

/* --------------------------------------------------------------- flights */

/**
 * Flight inventory currently comes from the deals layer (the same offers the
 * site sells). There is no live supplier feed connected yet, so we surface the
 * real generated legs with their true last-update timestamp instead of
 * inventing a supplier catalogue.
 */
export async function buildFlights(): Promise<AdminFlightRow[]> {
  const catalog = await loadCatalog();
  const disabled = await supabaseAdmin
    .from("system_settings").select("value").eq("key", "disabled_flight_ids").maybeSingle();
  const off = new Set(((disabled.data?.value as string[] | null) ?? []).map(String));

  const rows: AdminFlightRow[] = [];
  for (const deal of listDeals(catalog, 1)) {
    rows.push({
      id: `${deal.destination.slug}-out`,
      provider: deal.price.source,
      route: `TLV → ${deal.destination.name}`,
      departAt: deal.outbound.departAt,
      arriveAt: deal.outbound.arriveAt,
      price: deal.price.perPerson,
      stops: deal.outbound.stops,
      cabin: "Economy",
      enabled: !off.has(`${deal.destination.slug}-out`),
      lastUpdate: deal.price.verifiedAt,
    });
    rows.push({
      id: `${deal.destination.slug}-in`,
      provider: deal.price.source,
      route: `${deal.destination.name} → TLV`,
      departAt: deal.inbound.departAt,
      arriveAt: deal.inbound.arriveAt,
      price: deal.price.perPerson,
      stops: deal.inbound.stops,
      cabin: "Economy",
      enabled: !off.has(`${deal.destination.slug}-in`),
      lastUpdate: deal.price.verifiedAt,
    });
  }
  return rows;
}

export async function setFlightEnabled(id: string, enabled: boolean) {
  const { data } = await supabaseAdmin.from("system_settings").select("value").eq("key", "disabled_flight_ids").maybeSingle();
  const set = new Set(((data?.value as string[] | null) ?? []).map(String));
  if (enabled) set.delete(id); else set.add(id);
  const { error } = await supabaseAdmin.from("system_settings")
    .upsert({ key: "disabled_flight_ids", value: [...set] as never, is_public: false, updated_at: new Date().toISOString() });
  if (error) throw new AdminError(error.message);
}

/* ----------------------------------------------------------------- users */

export async function buildUsers(): Promise<AdminUserRow[]> {
  const [users, names, bookings, favRes, roleRows] = await Promise.all([
    authUsers(), nameMap(), allBookings(),
    supabaseAdmin.from("favorites").select("user_id"),
    supabaseAdmin.from("user_roles").select("user_id, role"),
  ]);

  const ordersByUser = new Map<string, { count: number; spend: number }>();
  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "refunded") continue;
    const cur = ordersByUser.get(b.user_id) ?? { count: 0, spend: 0 };
    cur.count += 1; cur.spend += Number(b.total_price);
    ordersByUser.set(b.user_id, cur);
  }
  const favByUser = new Map<string, number>();
  for (const f of favRes.data ?? []) if (f.user_id) favByUser.set(f.user_id, (favByUser.get(f.user_id) ?? 0) + 1);
  const rolesByUser = new Map<string, AdminRole[]>();
  for (const r of roleRows.data ?? []) {
    const l = rolesByUser.get(r.user_id) ?? [];
    l.push(r.role as AdminRole);
    rolesByUser.set(r.user_id, l);
  }

  return users
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .map((u) => ({
      id: u.id,
      name: names.get(u.id) ?? (u.email?.split("@")[0] ?? "—"),
      email: u.email,
      phone: u.phone,
      createdAt: u.created_at,
      orders: ordersByUser.get(u.id)?.count ?? 0,
      favorites: favByUser.get(u.id) ?? 0,
      spend: ordersByUser.get(u.id)?.spend ?? 0,
      roles: rolesByUser.get(u.id) ?? [],
      active: !u.banned,
    }));
}

export async function setUserActive(userId: string, active: boolean) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (error) throw new AdminError(error.message);
}

export async function setUserRole(userId: string, role: AdminRole, enabled: boolean) {
  if (enabled) {
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    if (error && error.code !== "23505") throw new AdminError(error.message);
  } else {
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) throw new AdminError(error.message);
  }
}

/* ---------------------------------------------------------------- orders */

export async function buildOrders(): Promise<AdminOrder[]> {
  const [bookings, names, users] = await Promise.all([allBookings(), nameMap(), authUsers()]);
  const emails = new Map(users.map((u) => [u.id, u.email] as const));
  return bookings.map((b) => toOrder(b, names, emails));
}

export async function setOrderStatus(id: string, status: string) {
  const { data: before } = await supabaseAdmin.from("bookings").select("status").eq("id", id).maybeSingle();
  const { error } = await supabaseAdmin.from("bookings").update({ status }).eq("id", id);
  if (error) throw new AdminError(error.message);
  return before?.status ?? null;
}

/* ---------------------------------------------------------------- alerts */

export async function buildAlerts(): Promise<AdminAlert[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_alerts").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new AdminError(error.message);
  return (data ?? []).map((a) => ({
    id: a.id, type: a.type, severity: a.severity, message: a.message,
    context: a.context, resolvedAt: a.resolved_at, createdAt: a.created_at,
  }));
}

export async function resolveAlert(id: string) {
  const { error } = await supabaseAdmin.from("admin_alerts")
    .update({ resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new AdminError(error.message);
}

/* -------------------------------------------------------------- settings */

export async function buildSettings(): Promise<SettingRow[]> {
  const { data, error } = await supabaseAdmin.from("system_settings").select("*").order("key");
  if (error) throw new AdminError(error.message);
  return (data ?? []).map((s) => ({ key: s.key, value: s.value, isPublic: s.is_public, updatedAt: s.updated_at }));
}

export async function saveSetting(key: string, value: unknown, actorId: string) {
  const { data: before } = await supabaseAdmin.from("system_settings").select("value").eq("key", key).maybeSingle();
  const { error } = await supabaseAdmin.from("system_settings").upsert({
    key, value: value as never, updated_by: actorId, updated_at: new Date().toISOString(),
  });
  if (error) throw new AdminError(error.message);
  return before?.value ?? null;
}

/* ----------------------------------------------------------------- audit */

export async function buildAudit(filters: {
  action?: string; resource?: string; actor?: string; from?: string; to?: string;
  page: number; pageSize: number;
}): Promise<Paged<AuditRow>> {
  let q = supabaseAdmin.from("admin_audit_log").select("*", { count: "exact" });
  if (filters.action) q = q.ilike("action", `%${filters.action}%`);
  if (filters.resource) q = q.ilike("resource", `%${filters.resource}%`);
  if (filters.actor) q = q.ilike("actor_email", `%${filters.actor}%`);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  const fromIdx = (filters.page - 1) * filters.pageSize;
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(fromIdx, fromIdx + filters.pageSize - 1);
  if (error) throw new AdminError(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map((r) => ({
      id: r.id, actorEmail: r.actor_email, action: r.action, resource: r.resource,
      resourceId: r.resource_id, previousValue: r.previous_value, newValue: r.new_value,
      ip: r.ip_address, createdAt: r.created_at,
    })),
  };
}

/* ----------------------------------------------------------- permissions */

export async function buildPermissionMatrix() {
  const { data, error } = await supabaseAdmin.from("role_permissions").select("role, permission, allowed");
  if (error) throw new AdminError(error.message);
  return (data ?? []).map((r) => ({ role: r.role as AdminRole, permission: r.permission as AdminPermission, allowed: r.allowed }));
}

export async function setRolePermission(role: AdminRole, permission: AdminPermission, allowed: boolean) {
  const { error } = await supabaseAdmin.from("role_permissions")
    .upsert({ role, permission, allowed }, { onConflict: "role,permission" });
  if (error) throw new AdminError(error.message);
}

export type { AuthedClient };
