import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  SectionCard,
  dateTime,
} from "@/components/admin/AdminUI";
import { adminAlerts, adminResolveAlert } from "@/lib/admin.functions";
import type { AdminAlert } from "@/lib/admin-types";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsPage,
});

const SEVERITY: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/5",
  error: "border-destructive/40 bg-destructive/5",
  warning: "border-amber-400/50 bg-amber-50",
  info: "border-border bg-card",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "קריטי",
  error: "שגיאה",
  warning: "אזהרה",
  info: "מידע",
};

function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: () => adminAlerts() as Promise<AdminAlert[]>,
    retry: false,
  });

  const resolve = useMutation({
    mutationFn: (id: string) => adminResolveAlert({ data: { id } }),
    onSuccess: () => {
      toast.success("ההתראה סומנה כטופלה");
      qc.invalidateQueries({ queryKey: ["admin", "alerts"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AdminLoading />;
  if (error) return <AdminError error={error} />;

  const open = data.filter((a) => !a.resolvedAt);
  const done = data.filter((a) => a.resolvedAt);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black sm:text-3xl">מרכז התראות</h1>

      <SectionCard
        title="התראות פתוחות"
        subtitle={`${open.length.toLocaleString("he-IL")} דורשות טיפול`}
      >
        {open.length === 0 ? (
          <AdminEmpty title="אין התראות פתוחות" hint="כל תקלות הסנכרון, התשלום וההזמנות מטופלות." />
        ) : (
          <ul className="space-y-2">
            {open.map((a) => (
              <li
                key={a.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4 ${SEVERITY[a.severity] ?? SEVERITY.info}`}
              >
                <div className="min-w-[220px] flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-bold">
                      {SEVERITY_LABEL[a.severity] ?? a.severity}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">{a.type}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {dateTime(a.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-bold">{a.message}</p>
                  {a.context && typeof a.context === "object" ? (
                    <pre
                      dir="ltr"
                      className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted p-2 text-[11px]"
                    >
                      {JSON.stringify(a.context, null, 2)}
                    </pre>
                  ) : null}
                </div>
                <button
                  onClick={() => resolve.mutate(a.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> סמן כטופל
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="היסטוריית התראות"
        subtitle={`${done.length.toLocaleString("he-IL")} טופלו`}
      >
        {done.length === 0 ? (
          <AdminEmpty title="אין התראות שטופלו" />
        ) : (
          <ul className="divide-y divide-border">
            {done.slice(0, 50).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="font-bold">{a.message}</span>
                <span className="text-[11px] text-muted-foreground">
                  טופל · {dateTime(a.resolvedAt!)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
