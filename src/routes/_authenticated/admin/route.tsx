// Admin layout: staff-only shell with a responsive RTL sidebar.
// The gate is client-side (the whole /_authenticated subtree is ssr:false) and
// is backed by server-side permission checks on every admin server function —
// hiding a link never grants access on its own.

import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Package,
  Plane,
  Settings,
  ShieldCheck,
  ScrollText,
  Users,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { NitziLogo } from "@/components/NitziLogo";
import { AdminError, AdminLoading } from "@/components/admin/AdminUI";
import { useAdminMe } from "@/lib/use-admin";
import { claimSuperAdmin } from "@/lib/admin.functions";
import { ROLE_LABELS, type AdminPermission } from "@/lib/admin-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "ניהול NITZI — לוח בקרה" },
      { name: "description", content: "לוח ניהול NITZI: הזמנות, משתמשים, חבילות, טיסות ודוחות." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm: AdminPermission;
}[] = [
  { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard, perm: "dashboard" },
  { to: "/admin/analytics", label: "אנליטיקת חיפוש", icon: BarChart3, perm: "analytics" },
  { to: "/admin/orders", label: "הזמנות", icon: ClipboardList, perm: "orders" },
  { to: "/admin/users", label: "משתמשים", icon: Users, perm: "users" },
  { to: "/admin/packages", label: "חבילות", icon: Package, perm: "packages" },
  { to: "/admin/flights", label: "טיסות", icon: Plane, perm: "flights" },
  { to: "/admin/notifications", label: "התראות", icon: Bell, perm: "notifications" },
  { to: "/admin/reports", label: "דוחות", icon: FileBarChart, perm: "reports" },
  { to: "/admin/audit", label: "יומן פעולות", icon: ScrollText, perm: "audit" },
  { to: "/admin/settings", label: "הגדרות", icon: Settings, perm: "settings" },
  { to: "/admin/providers", label: "בריאות ספקים", icon: PlugZap, perm: "settings" },
  { to: "/admin/permissions", label: "הרשאות", icon: ShieldCheck, perm: "permissions" },
];

function AdminLayout() {
  const { data: me, isPending, error, refetch } = useAdminMe();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const claim = useMutation({
    mutationFn: () => claimSuperAdmin(),
    onSuccess: async () => {
      toast.success("קיבלת הרשאת סופר אדמין");
      await qc.invalidateQueries({ queryKey: ["admin"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) {
    return (
      <div dir="rtl" className="min-h-screen bg-background p-8">
        <AdminLoading label="בודק הרשאות…" />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen bg-background p-8">
        <AdminError error={error} />
      </div>
    );
  }

  if (me && me.roles.length === 0) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-xl font-black">אזור ניהול</h1>
          {me.needsBootstrap ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                עדיין אין מנהל מוגדר במערכת. אפשר להגדיר את החשבון הזה כסופר אדמין.
              </p>
              <button
                onClick={() => claim.mutate()}
                disabled={claim.isPending}
                className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {claim.isPending ? "מגדיר…" : "הגדר אותי כסופר אדמין"}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              אין לך הרשאות ניהול. פנה למנהל המערכת.
            </p>
          )}
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary"
          >
            <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> חזרה לאתר
          </Link>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => me?.permissions.includes(n.perm));

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <NitziLogo />
        <Link to="/" className="text-xs font-bold text-primary">
          לאתר
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-3 py-4 sm:px-6">
        <aside
          className={cn(
            "z-20 w-60 shrink-0 lg:block",
            open
              ? "fixed inset-x-3 top-16 block rounded-2xl border border-border bg-card p-3 shadow-xl"
              : "hidden",
            "lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-4",
          )}
        >
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <NitziLogo />
            <Link to="/" className="text-[11px] font-bold text-primary">
              לאתר
            </Link>
          </div>
          <p className="mb-2 px-2 text-[11px] font-bold text-muted-foreground">
            {me?.email} · {me?.roles.map((r) => ROLE_LABELS[r]).join(", ")}
          </p>
          <nav className="flex flex-col gap-1">
            {items.map((n) => {
              const active = n.to === "/admin" ? pathname === "/admin" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
