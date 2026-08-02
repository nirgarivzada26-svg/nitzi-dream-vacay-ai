import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Banknote, Eye, Percent, ShoppingBag, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";
import {
  AdminEmpty, AdminError, AdminLoading, DataTable, SectionCard, StatCard, StatusChip, dateTime, money,
} from "@/components/admin/AdminUI";
import { adminOverview } from "@/lib/admin.functions";
import type { AdminOrder, AdminOverview, AdminUserRow, NamedCount } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function MiniBars({ data, empty }: { data: NamedCount[]; empty: string }) {
  if (data.length === 0) return <AdminEmpty title={empty} hint="הנתונים יופיעו כאן ברגע שתהיה פעילות אמיתית." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ right: 8, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="value" fill="var(--color-primary, #0ea5e9)" radius={6} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AdminDashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview() as Promise<AdminOverview>,
    retry: false,
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const o = data;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">לוח בקרה</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="הכנסות היום" value={money(o.revenueToday)} icon={Banknote} tone="success" />
        <StatCard label="הכנסות השבוע" value={money(o.revenueWeek)} icon={TrendingUp} />
        <StatCard label="הכנסות החודש" value={money(o.revenueMonth)} icon={Wallet} />
        <StatCard label="סה״כ הזמנות" value={o.totalOrders.toLocaleString("he-IL")} icon={ShoppingBag} />
        <StatCard label="ערך הזמנה ממוצע" value={money(o.averageOrderValue)} icon={Banknote} />
        <StatCard label="שיעור המרה" value={`${o.conversionRate}%`} hint="הזמנות מתוך חיפושים ב-30 יום" icon={Percent} />
        <StatCard label="משתמשים פעילים" value={o.activeUsers.toLocaleString("he-IL")} hint="פעילות ב-30 הימים האחרונים" icon={Users} />
        <StatCard label="משתמשים חדשים היום" value={o.newUsersToday.toLocaleString("he-IL")} icon={UserPlus} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="הכנסות לפי יום" subtitle="14 הימים האחרונים">
          {o.byDay.every((d) => d.revenue === 0) ? (
            <AdminEmpty title="אין הכנסות ב-14 הימים האחרונים" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={o.byDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="הזמנות לפי יום" subtitle="14 הימים האחרונים">
          {o.byDay.every((d) => d.orders === 0) ? (
            <AdminEmpty title="אין הזמנות ב-14 הימים האחרונים" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={o.byDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#f59e0b" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="יעדים מובילים" subtitle="לפי מספר הזמנות">
          <MiniBars data={o.topDestinations} empty="אין עדיין הזמנות" />
        </SectionCard>

        <SectionCard title="החבילות הנמכרות ביותר" subtitle="לפי מספר הזמנות">
          <MiniBars data={o.topPackages} empty="אין עדיין מכירות" />
        </SectionCard>

        <SectionCard title="החבילות הנצפות ביותר" subtitle="30 הימים האחרונים" action={<Eye className="h-4 w-4 text-muted-foreground" />}>
          <MiniBars data={o.mostViewed} empty="אין עדיין צפיות מתועדות" />
        </SectionCard>
      </div>

      <SectionCard title="הזמנות אחרונות" action={<Link to="/admin/orders" className="text-xs font-bold text-primary">לכל ההזמנות</Link>}>
        <DataTable<AdminOrder>
          rows={o.latestOrders}
          rowKey={(r) => r.id}
          pageSize={10}
          emptyTitle="אין עדיין הזמנות"
          columns={[
            { key: "id", header: "מס׳ הזמנה", render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}</span> },
            { key: "customer", header: "לקוח", render: (r) => r.customer },
            { key: "dest", header: "יעד", render: (r) => r.destination },
            { key: "total", header: "סכום", render: (r) => money(r.total, r.currency) },
            { key: "status", header: "סטטוס", render: (r) => <StatusChip status={r.status} /> },
            { key: "created", header: "נוצר", render: (r) => dateTime(r.createdAt) },
          ]}
        />
      </SectionCard>

      <SectionCard title="משתמשים אחרונים" action={<Link to="/admin/users" className="text-xs font-bold text-primary">לכל המשתמשים</Link>}>
        <DataTable<AdminUserRow>
          rows={o.latestUsers}
          rowKey={(r) => r.id}
          pageSize={8}
          emptyTitle="אין עדיין משתמשים"
          columns={[
            { key: "name", header: "שם", render: (r) => r.name },
            { key: "email", header: "אימייל", render: (r) => r.email ?? "—" },
            { key: "created", header: "תאריך הרשמה", render: (r) => dateTime(r.createdAt) },
            { key: "orders", header: "סה״כ הזמנות", render: (r) => r.orders },
          ]}
        />
      </SectionCard>
    </div>
  );
}
