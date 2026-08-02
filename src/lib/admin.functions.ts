import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AdminAlert, AdminFlightRow, AdminMe, AdminOrder, AdminOverview, AdminPackageRow,
  AdminPermission, AdminRole, AdminUserRow, AuditRow, Paged, SearchAnalytics, SettingRow,
} from "./admin-types";

const roleEnum = z.enum(["super_admin", "admin", "support", "marketing", "content_manager", "finance"]);

export const adminMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMe> => {
    const m = await import("./admin.server");
    const roles = await m.rolesOf(context.userId);
    const permissions = await m.permissionsOf(roles);
    const count = await m.staffCount();
    return {
      userId: context.userId,
      email: (context.claims as { email?: string } | null)?.email ?? null,
      roles,
      permissions,
      needsBootstrap: count === 0,
    };
  });

/** First signed-in user may claim super admin while no staff exists. */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    if ((await m.staffCount()) > 0) throw new m.AdminError("כבר קיים מנהל במערכת");
    await m.setUserRole(context.userId, "super_admin", true);
    await m.logAudit({
      actorId: context.userId,
      actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
      action: "claim_super_admin", resource: "user_roles", resourceId: context.userId,
      newValue: { role: "super_admin" },
    });
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "dashboard");
    return m.buildOverview();
  });

export const adminSearchAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SearchAnalytics> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "analytics");
    return m.buildSearchAnalytics();
  });

export const adminPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPackageRow[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "packages");
    return m.buildPackages();
  });

export const adminPackageAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      action: z.enum(["archive", "activate", "delete", "duplicate", "feature", "unfeature", "update"]),
      slugs: z.array(z.string()).min(1),
      patch: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: true; slug?: string }> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "packages");
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    let created: string | undefined;

    if (data.action === "archive") await m.setDestinationActive(data.slugs, false);
    if (data.action === "activate") await m.setDestinationActive(data.slugs, true);
    if (data.action === "delete") for (const s of data.slugs) await m.deleteDestination(s);
    if (data.action === "duplicate") created = await m.duplicateDestination(data.slugs[0]);
    if (data.action === "update") await m.updateDestination(data.slugs[0], data.patch ?? {});
    if (data.action === "feature" || data.action === "unfeature") {
      const settings = await m.buildSettings();
      const cur = new Set(((settings.find((s) => s.key === "featured_deal_slugs")?.value as string[] | null) ?? []).map(String));
      for (const s of data.slugs) data.action === "feature" ? cur.add(s) : cur.delete(s);
      await m.saveSetting("featured_deal_slugs", [...cur], context.userId);
    }

    await m.logAudit({
      actorId: context.userId, actorEmail: email, action: `package_${data.action}`,
      resource: "destinations", resourceId: data.slugs.join(","),
      newValue: data.patch ?? { slugs: data.slugs },
    });
    return { ok: true, slug: created };
  });

export const adminFlights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminFlightRow[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "flights");
    return m.buildFlights();
  });

export const adminSetFlightEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string(), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "flights");
    await m.setFlightEnabled(data.id, data.enabled);
    await m.logAudit({
      actorId: context.userId, actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
      action: data.enabled ? "flight_enable" : "flight_disable", resource: "flights", resourceId: data.id,
      newValue: { enabled: data.enabled },
    });
    return { ok: true };
  });

export const adminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "users");
    return m.buildUsers();
  });

export const adminUserAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      action: z.enum(["deactivate", "reactivate", "set_role", "unset_role"]),
      role: roleEnum.optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    const roles = await m.requirePermission(context.userId, "users");
    const email = (context.claims as { email?: string } | null)?.email ?? null;

    if (data.action === "deactivate" || data.action === "reactivate") {
      await m.setUserActive(data.userId, data.action === "reactivate");
    } else {
      if (!roles.includes("super_admin")) throw new m.AdminError("רק סופר אדמין יכול לשנות תפקידים");
      if (!data.role) throw new m.AdminError("חסר תפקיד");
      await m.setUserRole(data.userId, data.role as AdminRole, data.action === "set_role");
    }

    await m.logAudit({
      actorId: context.userId, actorEmail: email, action: `user_${data.action}`,
      resource: "users", resourceId: data.userId, newValue: { role: data.role ?? null },
    });
    return { ok: true };
  });

export const adminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "orders");
    return m.buildOrders();
  });

export const adminOrderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), action: z.enum(["refund", "cancel", "confirm", "resend_email"]) }).parse(d),
  )
  .handler(async ({ context, data }): Promise<{ ok: true; status?: string }> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "orders");
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    let previous: string | null = null;
    let status: string | undefined;

    if (data.action !== "resend_email") {
      status = data.action === "refund" ? "refunded" : data.action === "cancel" ? "cancelled" : "confirmed";
      previous = await m.setOrderStatus(data.id, status);
    }

    await m.logAudit({
      actorId: context.userId, actorEmail: email, action: `order_${data.action}`,
      resource: "bookings", resourceId: data.id,
      previousValue: previous ? { status: previous } : null,
      newValue: status ? { status } : { emailQueued: true },
    });
    return { ok: true, status };
  });

export const adminAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAlert[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "notifications");
    return m.buildAlerts();
  });

export const adminResolveAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "notifications");
    await m.resolveAlert(data.id);
    await m.logAudit({
      actorId: context.userId, actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
      action: "alert_resolve", resource: "admin_alerts", resourceId: data.id,
    });
    return { ok: true };
  });

export const adminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SettingRow[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "settings");
    return m.buildSettings();
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().min(1), value: z.unknown() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "settings");
    const previous = await m.saveSetting(data.key, data.value, context.userId);
    await m.logAudit({
      actorId: context.userId, actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
      action: "setting_update", resource: "system_settings", resourceId: data.key,
      previousValue: previous, newValue: data.value,
    });
    return { ok: true };
  });

export const adminAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      action: z.string().optional(), resource: z.string().optional(), actor: z.string().optional(),
      from: z.string().optional(), to: z.string().optional(),
      page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<Paged<AuditRow>> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "audit");
    return m.buildAudit(data);
  });

export const adminPermissionMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ role: AdminRole; permission: AdminPermission; allowed: boolean }[]> => {
    const m = await import("./admin.server");
    await m.requirePermission(context.userId, "permissions");
    return m.buildPermissionMatrix();
  });

export const adminSetPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ role: roleEnum, permission: z.string(), allowed: z.boolean() }).parse(d))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const m = await import("./admin.server");
    const roles = await m.requirePermission(context.userId, "permissions");
    if (!roles.includes("super_admin")) throw new m.AdminError("רק סופר אדמין יכול לשנות הרשאות");
    await m.setRolePermission(data.role as AdminRole, data.permission as AdminPermission, data.allowed);
    await m.logAudit({
      actorId: context.userId, actorEmail: (context.claims as { email?: string } | null)?.email ?? null,
      action: "permission_update", resource: "role_permissions", resourceId: `${data.role}:${data.permission}`,
      newValue: { allowed: data.allowed },
    });
    return { ok: true };
  });
