// Final commercial launch checklist — admin screen.
//
// Runs the real business/legal/payments/supplier/security probes and shows the
// recorded commercial gate plus the live monitoring pulse.

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Activity,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  AdminError,
  AdminLoading,
  SectionCard,
  StatCard,
  dateTime,
} from "@/components/admin/AdminUI";
import {
  getCommercialState,
  runCommercialChecklistFn,
  type CommercialState,
} from "@/lib/commercial.functions";
import type { LaunchCheck, LaunchStatus } from "@/lib/launch/launch-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/commercial")({
  head: () => ({
    meta: [
      { title: "צ׳קליסט מסחרי — ניהול NITZI" },
      {
        name: "description",
        content: "בדיקות עסקיות, משפטיות ותפעוליות לפני מעבר למכירה חיה.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CommercialPage,
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
        <p className="text-sm break-words text-muted-foreground">{check.detail}</p>
        {check.remediation && (
          <p className="mt-1 text-sm text-amber-700">נדרש: {check.remediation}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{check.durationMs}ms</span>
    </li>
  );
}

function CommercialPage() {
  const state = useQuery<CommercialState>({
    queryKey: ["admin", "commercial"],
    queryFn: () => getCommercialState(),
  });

  const runIt = useMutation({ mutationFn: () => runCommercialChecklistFn() });

  const data = runIt.data ?? state.data;

  if (state.isPending) return <AdminLoading label="טוען מצב מסחרי…" />;
  if (state.error) return <AdminError error={state.error} />;

  const report = runIt.data?.report ?? null;
  const gate = data?.gate ?? null;
  const pulse = data?.pulse ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">צ׳קליסט מסחרי — השקה סופית</h1>
          <p className="text-muted-foreground">
            עסקי, משפטי, סליקה, דיוור, ספקים, ניטור, גיבוי, אבטחה וחוויית לקוח. מכירה חיה נפתחת רק
            כששני הצ׳קליסטים ירוקים.
          </p>
        </div>
        <button
          onClick={() => runIt.mutate()}
          disabled={runIt.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", runIt.isPending && "animate-spin")} />
          {runIt.isPending ? "מריץ בדיקות…" : "הרץ צ׳קליסט מסחרי"}
        </button>
      </header>

      {runIt.error && <AdminError error={runIt.error} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="שער מסחרי"
          value={gate?.open ? "פתוח" : "חסום"}
          hint={gate ? `עודכן ${dateTime(gate.ranAt)}` : "טרם הורץ"}
          icon={ShieldCheck}
        />
        <StatCard label="עברו" value={String(gate?.pass ?? 0)} icon={CheckCircle2} />
        <StatCard label="אזהרות" value={String(gate?.warn ?? 0)} icon={AlertTriangle} />
        <StatCard label="נכשלו" value={String(gate?.fail ?? 0)} icon={XCircle} />
      </div>

      <SectionCard title="ניטור לאחר השקה (24 שעות)">
        {pulse ? (
          <div className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <p>הזמנות: {pulse.metrics.bookings}</p>
              <p>הזמנות כושלות: {pulse.metrics.failedBookings}</p>
              <p>תשלומים: {pulse.metrics.payments}</p>
              <p>תשלומים כושלים: {pulse.metrics.failedPayments}</p>
              <p>החזרים: {pulse.metrics.refunds}</p>
              <p>קריאות ספקים: {pulse.metrics.providerCalls}</p>
              <p>שיעור כשל ספקים: {Math.round(pulse.metrics.providerFailureRate * 100)}%</p>
              <p>Webhooks שנדחו: {pulse.metrics.failedWebhooks}</p>
              <p>שגיאות AI: {pulse.metrics.aiErrors}</p>
              <p>שגיאות אפליקציה: {pulse.metrics.appErrors}</p>
            </div>
            {pulse.alerts.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-600">
                <Activity className="size-4" /> אין חריגות מספי ההתראה
              </p>
            ) : (
              <ul className="list-disc space-y-1 pe-5 text-sm text-destructive">
                {pulse.alerts.map((a) => (
                  <li key={a.id}>
                    {a.title} — {a.detail} (סף: {a.threshold})
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">אין נתוני ניטור.</p>
        )}
      </SectionCard>

      <SectionCard title="מצב מכירה חיה">
        <p className="text-sm">
          {data?.liveMode
            ? gate?.open
              ? "מצב חי פעיל והשער המסחרי פתוח."
              : "מצב חי מוגדר בסביבה אך השער המסחרי חסום — הבקשות לספקים החיים נחסמות."
            : "מצב חי כבוי. הפעל אותו רק אחרי ששני הצ׳קליסטים עוברים במלואם."}
        </p>
        {gate && gate.blockers.length > 0 && (
          <ul className="mt-3 max-h-72 list-disc space-y-1 overflow-auto pe-5 text-sm text-muted-foreground">
            {gate.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      {!report && (
        <SectionCard title="הרצה נדרשת">
          <p className="text-sm text-muted-foreground">
            לחץ על «הרץ צ׳קליסט מסחרי» כדי לבצע את הבדיקות עכשיו: קריאת פרטי החברה, בדיקת רשומות
            SPF/DKIM/DMARC בפועל, בחינת אדפטרי הספקים, בדיקת הגנת כפילות בתשלומים ומדידת שגיאות.
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
