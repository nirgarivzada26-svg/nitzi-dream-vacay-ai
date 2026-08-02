import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { AdminError, AdminLoading, SectionCard, money } from "@/components/admin/AdminUI";
import { exportCsv, exportExcel, exportPdf, type Row } from "@/lib/admin-export";
import { adminOrders, adminPackages, adminSearchAnalytics, adminUsers } from "@/lib/admin.functions";
import type { AdminOrder, AdminPackageRow, AdminUserRow, SearchAnalytics } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: () => adminOrders() as Promise<AdminOrder[]>, retry: false });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => adminUsers() as Promise<AdminUserRow[]>, retry: false });
  const packages = useQuery({ queryKey: ["admin", "packages"], queryFn: () => adminPackages() as Promise<AdminPackageRow[]>, retry: false });
  const analytics = useQuery({ queryKey: ["admin", "analytics"], queryFn: () => adminSearchAnalytics() as Promise<SearchAnalytics>, retry: false });

  const firstError = orders.error ?? users.error ?? packages.error ?? analytics.error;
  if (firstError) return <AdminError error={firstError} />;

  const ordersData = orders.data;
  const usersData = users.data;
  const packagesData = packages.data;
  const analyticsData = analytics.data;
  if (!ordersData || !usersData || !packagesData || !analyticsData) return <AdminLoading />;

  const revenue = ordersData
    .filter((o) => o.status === "confirmed")
    .reduce((s, o) => s + o.total, 0);

  const reports: { id: string; title: string; subtitle: string; rows: Row[] }[] = [
    {
      id: "orders",
      title: "דוח הזמנות",
      subtitle: `${ordersData.length.toLocaleString("he-IL")} הזמנות · הכנסות מאושרות ${money(revenue)}`,
      rows: ordersData.map((o) => ({
        "מס' הזמנה": o.id, לקוח: o.customer, אימייל: o.email ?? "", יעד: o.destination,
        נוסעים: o.people, לילות: o.nights, סכום: o.total, מטבע: o.currency,
        סטטוס: o.status, "אמצעי תשלום": o.paymentMethod ?? "", תאריך: o.createdAt,
      })),
    },
    {
      id: "revenue",
      title: "דוח הכנסות לפי יעד",
      subtitle: "סכימת הזמנות מאושרות",
      rows: Object.entries(
        ordersData.filter((o) => o.status === "confirmed").reduce<Record<string, { count: number; total: number }>>((acc, o) => {
          const cur = acc[o.destination] ?? { count: 0, total: 0 };
          acc[o.destination] = { count: cur.count + 1, total: cur.total + o.total };
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1].total - a[1].total)
        .map(([dest, v]) => ({ יעד: dest, הזמנות: v.count, הכנסות: v.total })),
    },
    {
      id: "users",
      title: "דוח משתמשים",
      subtitle: `${usersData.length.toLocaleString("he-IL")} משתמשים רשומים`,
      rows: usersData.map((u) => ({
        שם: u.name, אימייל: u.email ?? "", טלפון: u.phone ?? "", הרשמה: u.createdAt,
        הזמנות: u.orders, מועדפים: u.favorites, "סה\"כ רכישות": u.spend, פעיל: u.active ? "כן" : "לא",
      })),
    },
    {
      id: "packages",
      title: "דוח ביצועי חבילות",
      subtitle: "צפיות, הזמנות ושיעור המרה",
      rows: packagesData.map((p) => ({
        חבילה: p.name, יעד: p.destination, מחיר: p.price, צפיות: p.views,
        הזמנות: p.orders, "המרה %": p.conversionRate, "מחיר חכם": p.smartPrice, פעילה: p.active ? "כן" : "לא",
      })),
    },
    {
      id: "searches",
      title: "דוח חיפושים",
      subtitle: `${analyticsData.totalSearches.toLocaleString("he-IL")} חיפושים · ${analyticsData.noResultsCount.toLocaleString("he-IL")} ללא תוצאה`,
      rows: analyticsData.topDestinations.map((d) => ({ יעד: d.label, חיפושים: d.value })),
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">דוחות</h1>
      <p className="text-xs text-muted-foreground">כל הדוחות נבנים מנתוני המערכת בזמן אמת — ללא ערכים מומצאים.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <SectionCard key={r.id} title={r.title} subtitle={r.subtitle}>
            <p className="mb-3 text-xs text-muted-foreground">
              {r.rows.length.toLocaleString("he-IL")} שורות בדוח
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportCsv(r.rows, `nitzi-${r.id}`)}
                disabled={r.rows.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => exportExcel(r.rows, `nitzi-${r.id}`)}
                disabled={r.rows.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button
                onClick={() => exportPdf(r.rows, `nitzi-${r.id}`, r.title)}
                disabled={r.rows.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
