import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, SearchX } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionCard,
  StatCard,
} from "@/components/admin/AdminUI";
import { adminSearchAnalytics } from "@/lib/admin.functions";
import type { NamedCount, SearchAnalytics } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

function Chart({ data, empty }: { data: NamedCount[]; empty: string }) {
  if (data.length === 0)
    return <AdminEmpty title={empty} hint="הנתונים נאספים מחיפושים אמיתיים של משתמשים." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ right: 8, left: 8 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#0ea5e9" radius={6} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AnalyticsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => adminSearchAnalytics() as Promise<SearchAnalytics>,
    retry: false,
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">אנליטיקת חיפוש</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="סה״כ חיפושים"
          value={data.totalSearches.toLocaleString("he-IL")}
          icon={Search}
        />
        <StatCard
          label="חיפושים ללא תוצאה"
          value={data.noResultsCount.toLocaleString("he-IL")}
          icon={SearchX}
          tone="warning"
        />
        <StatCard
          label="שיעור ללא תוצאה"
          value={
            data.totalSearches
              ? `${Math.round((data.noResultsCount / data.totalSearches) * 100)}%`
              : "—"
          }
          tone="warning"
        />
        <StatCard
          label="יעדים ייחודיים"
          value={data.topDestinations.length.toLocaleString("he-IL")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="היעדים המחופשים ביותר">
          <Chart data={data.topDestinations} empty="אין עדיין חיפושים" />
        </SectionCard>
        <SectionCard title="חיפושים ללא תוצאות" subtitle="ביקוש שאין לו כרגע מלאי">
          <Chart data={data.noResults} empty="אין חיפושים ללא תוצאה" />
        </SectionCard>
        <SectionCard title="תאריכי נסיעה מבוקשים" subtitle="לפי חודש החיפוש">
          <Chart data={data.popularMonths} empty="אין נתוני תאריכים" />
        </SectionCard>
        <SectionCard title="תקציבים פופולריים">
          <Chart data={data.popularBudgets} empty="אין נתוני תקציב" />
        </SectionCard>
        <SectionCard title="שדות תעופה מבוקשים" subtitle="מוצא שנבחר בחיפוש טיסות">
          <Chart data={data.popularAirports} empty="אין נתוני שדות תעופה" />
        </SectionCard>
      </div>
    </div>
  );
}
