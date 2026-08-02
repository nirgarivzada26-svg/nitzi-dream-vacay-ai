// Sprint 9 — Launch Checklist screen.
//
// Runs the real checklist on demand and shows the recorded launch gate.
// LIVE_MODE only reaches live suppliers while the gate is open.

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, Rocket, RefreshCw } from "lucide-react";
import {
  AdminError,
  AdminLoading,
  SectionCard,
  StatCard,
  dateTime,
} from "@/components/admin/AdminUI";
import { getLaunchState, runLaunchChecklistFn, type LaunchState } from "@/lib/launch.functions";
import type { LaunchCheck, LaunchStatus } from "@/lib/launch/launch-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/launch")({
  head: () => ({
    meta: [
      { title: "צ׳קליסט השקה — ניהול NITZI" },
      { name: "description", content: "בדיקות השקה מלאות לפני מעבר למצב חי." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LaunchPage,
});

const ICONS: Record<LaunchStatus, React.ComponentType<{ className?: string }>> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const TONES: Record<LaunchStatus, string> = {
  pass: "text-emerald-600",
  warn: "text-amber-600",
  fail: "text-destructive",
};

function CheckRow({ check }: { check: LaunchCheck }) {
  const Icon = ICONS[check.status];
  return (
    <li className="flex gap-3 border-b border-border/60 py-3 last:border-0">
      <Icon className={cn("mt-0.5 size-5 shrink-0", TONES[check.status])} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{check.label}</p>
        <p className="text-sm text-muted-foreground">{check.detail}</p>
        {check.remediation && (
          <p className="mt-1 text-sm text-amber-700">נדרש: {check.remediation}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{check.durationMs}ms</span>
    </li>
  );
}

function LaunchPage() {
  const state = useQuery<LaunchState>({
    queryKey: ["admin", "launch"],
    queryFn: () => getLaunchState(),
  });

  const runIt = useMutation({
    mutationFn: () => runLaunchChecklistFn(),
  });

  const data = runIt.data ?? state.data;

  if (state.isPending) return <AdminLoading label="טוען מצב השקה…" />;
  if (state.error) return <AdminError error={state.error} />;

  const report = runIt.data?.report ?? null;
  const gate = data?.gate ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">צ׳קליסט השקה</h1>
          <p className="text-muted-foreground">
            כל פריט נבדק בפועל מול הקוד, הספקים והמסד. LIVE_MODE נפתח רק כשהכול עובר.
          </p>
        </div>
        <button
          onClick={() => runIt.mutate()}
          disabled={runIt.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", runIt.isPending && "animate-spin")} />
          {runIt.isPending ? "מריץ בדיקות…" : "הרץ צ׳קליסט מלא"}
        </button>
      </header>

      {runIt.error && <AdminError error={runIt.error} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="מצב שער ההשקה"
          value={gate?.open ? "פתוח" : "חסום"}
          hint={gate ? `עודכן ${dateTime(gate.ranAt)}` : "טרם הורץ צ׳קליסט"}
          icon={Rocket}
        />
        <StatCard label="עברו" value={String(gate?.pass ?? 0)} icon={CheckCircle2} />
        <StatCard label="אזהרות" value={String(gate?.warn ?? 0)} icon={AlertTriangle} />
        <StatCard label="נכשלו" value={String(gate?.fail ?? 0)} icon={XCircle} />
      </div>

      <SectionCard title="מצב LIVE_MODE">
        <p className="text-sm">
          {data?.liveMode
            ? gate?.open
              ? "מצב חי פעיל והשער פתוח — הספקים החיים מקבלים בקשות."
              : "מצב חי מוגדר בסביבה, אך השער חסום: הבקשות לספקים החיים נחסמות והמערכת ממשיכה עם ספק הדמו."
            : "מצב חי כבוי (NITZI_LIVE_MODE). הפעל אותו רק אחרי שכל הפריטים בצ׳קליסט ירוקים."}
        </p>
        {gate && gate.blockers.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pe-5 text-sm text-muted-foreground">
            {gate.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      {!report && (
        <SectionCard title="הרצה נדרשת">
          <p className="text-sm text-muted-foreground">
            לחץ על «הרץ צ׳קליסט מלא» כדי לבצע את הבדיקות עכשיו. ההרצה מבצעת חיפושים אמיתיים, אימותי
            מחיר, בדיקות מסד נתונים והפקת מסמכים.
          </p>
        </SectionCard>
      )}

      {report?.groups.map((group) => (
        <SectionCard key={group.id} title={group.label}>
          <ul>
            {group.checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}
