// Admin → בריאות ספקים: configuration status, latency and failures per
// provider, straight from the provider_events ledger.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CheckCircle2, PlugZap, TimerReset, XCircle } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionCard,
  StatCard,
} from "@/components/admin/AdminUI";
import { getProviderDashboard } from "@/lib/providers.functions";
import { PROVIDER_KIND_LABELS, type ProviderKind } from "@/lib/providers/contracts";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({
    meta: [
      { title: "בריאות ספקים — ניהול NITZI" },
      {
        name: "description",
        content: "מצב חיבור, זמני תגובה וכשלים של ספקי הטיסות, המלונות, הסליקה וההודעות.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProvidersPage,
});

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ProvidersPage() {
  const fetchDashboard = useServerFn(getProviderDashboard);
  const query = useQuery({
    queryKey: ["admin", "providers", 24],
    queryFn: () => fetchDashboard({ data: { windowHours: 24 } }),
    refetchInterval: 60_000,
  });

  if (query.isLoading) return <AdminLoading label="טוען מצב ספקים…" />;
  if (query.error) return <AdminError error={query.error} />;
  const data = query.data;
  if (!data) return <AdminEmpty title="אין נתוני ספקים" />;

  const grouped = new Map<ProviderKind, typeof data.statuses>();
  for (const s of data.statuses) {
    const list = grouped.get(s.kind) ?? [];
    list.push(s);
    grouped.set(s.kind, list);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="מצב מערכת"
          value={data.liveMode ? "ספקים חיים" : "מצב דמו"}
          hint={
            data.liveMode ? "הזמנות נשלחות לספקים אמיתיים" : "NITZI Demo Provider מספק את הנתונים"
          }
          icon={PlugZap}
          tone={data.liveMode ? "success" : "warning"}
        />
        <StatCard
          label="קריאות (24 שעות)"
          value={data.health.totalCalls.toLocaleString("he-IL")}
          icon={Activity}
        />
        <StatCard
          label="כשלים"
          value={data.health.totalFailures.toLocaleString("he-IL")}
          icon={XCircle}
          tone={data.health.totalFailures > 0 ? "warning" : "success"}
        />
        <StatCard
          label="ספקים מחוברים"
          value={`${data.statuses.filter((s) => s.configured).length}/${data.statuses.length}`}
          icon={CheckCircle2}
        />
      </div>

      {Array.from(grouped.entries()).map(([kind, list]) => (
        <SectionCard key={kind} title={PROVIDER_KIND_LABELS[kind]}>
          <div className="space-y-2">
            {list.map((s) => {
              const metric = data.health.providers.find((p) => p.providerId === s.id);
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{s.label}</span>
                      {s.active ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          פעיל
                        </span>
                      ) : null}
                      <span
                        className={
                          s.configured
                            ? "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary"
                            : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
                        }
                      >
                        {s.configured ? "מוגדר" : "חסרים מפתחות"}
                      </span>
                    </div>
                    {s.missingEnv.length > 0 ? (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground" dir="ltr">
                        {s.missingEnv.join(" · ")}
                      </p>
                    ) : null}
                    {metric?.lastErrorMessage ? (
                      <p className="mt-1 text-[11px] text-destructive">{metric.lastErrorMessage}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TimerReset className="h-3.5 w-3.5" />
                      {metric
                        ? `${metric.avgLatencyMs}ms · p95 ${metric.p95LatencyMs}ms`
                        : "אין מדידות"}
                    </span>
                    <span>{metric ? `${metric.calls} קריאות` : "—"}</span>
                    <span className={metric && metric.failureRate > 0.1 ? "text-destructive" : ""}>
                      {metric ? `כשל ${pct(metric.failureRate)}` : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}

      <SectionCard title="כשלים לפי פעולה (24 שעות)">
        {data.health.failuresByOperation.length === 0 ? (
          <AdminEmpty title="לא נרשמו כשלים" hint="כל קריאות הספקים ב-24 השעות האחרונות הצליחו." />
        ) : (
          <div className="space-y-2">
            {data.health.failuresByOperation.map((row) => (
              <div
                key={row.operation}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3 text-sm"
              >
                <span className="font-bold text-foreground" dir="ltr">
                  {row.operation}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {row.lastMessage}
                </span>
                <span className="shrink-0 text-xs font-bold text-destructive">{row.failures}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
