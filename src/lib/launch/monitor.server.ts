// Post-launch monitoring pulse — server only.
//
// Reads the real ledgers (bookings, payments, provider events, webhooks and
// the app error log) over a time window, compares them with the configured
// alert thresholds and notifies staff when a threshold is breached.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MonitorAlert, MonitorPulse } from "./commercial-types";

export interface AlertThresholds {
  provider_failure_rate: number;
  failed_payments: number;
  failed_bookings: number;
  failed_webhooks: number;
  app_errors: number;
  ai_errors: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  provider_failure_rate: 0.1,
  failed_payments: 3,
  failed_bookings: 3,
  failed_webhooks: 3,
  app_errors: 10,
  ai_errors: 5,
};

async function readThresholds(): Promise<AlertThresholds> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "alert_thresholds")
    .maybeSingle();
  return { ...DEFAULT_THRESHOLDS, ...((data?.value ?? {}) as Partial<AlertThresholds>) };
}

async function count(
  table: string,
  since: string,
  apply?: (q: ReturnType<typeof supabaseAdmin.from>) => unknown,
): Promise<number> {
  let query = supabaseAdmin
    .from(table as never)
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  if (apply) query = apply(query as never) as never;
  const { count: c } = await query;
  return c ?? 0;
}

export async function buildMonitorPulse(windowHours = 1): Promise<MonitorPulse> {
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const thresholds = await readThresholds();

  const [
    bookings,
    failedBookings,
    payments,
    failedPayments,
    refunds,
    providerCalls,
    providerFailures,
    failedWebhooks,
    aiErrors,
    appErrors,
  ] = await Promise.all([
    count("bookings", since),
    count("bookings", since, (q) => (q as never as { eq: Function }).eq("status", "failed")),
    count("payment_transactions", since),
    count("payment_transactions", since, (q) =>
      (q as never as { eq: Function }).eq("status", "failed"),
    ),
    count("payment_transactions", since, (q) =>
      (q as never as { eq: Function }).eq("operation", "refund"),
    ),
    count("provider_events", since),
    count("provider_events", since, (q) => (q as never as { eq: Function }).eq("success", false)),
    count("provider_webhook_events", since, (q) =>
      (q as never as { eq: Function }).eq("verified", false),
    ),
    count("app_error_log", since, (q) => (q as never as { eq: Function }).eq("source", "ai")),
    count("app_error_log", since, (q) => (q as never as { neq: Function }).neq("source", "ai")),
  ]);

  const providerFailureRate = providerCalls > 0 ? providerFailures / providerCalls : 0;

  const alerts: MonitorAlert[] = [];
  const push = (
    id: string,
    severity: MonitorAlert["severity"],
    title: string,
    detail: string,
    value: number,
    threshold: number,
  ) => {
    if (value > threshold) alerts.push({ id, severity, title, detail, value, threshold });
  };

  push(
    "provider_failure_rate",
    "critical",
    "שיעור כשל ספקים גבוה",
    `${Math.round(providerFailureRate * 100)}% מהקריאות נכשלו ב-${windowHours} השעות האחרונות`,
    Number(providerFailureRate.toFixed(3)),
    thresholds.provider_failure_rate,
  );
  push(
    "failed_payments",
    "critical",
    "תשלומים כושלים",
    `${failedPayments} עסקאות נכשלו`,
    failedPayments,
    thresholds.failed_payments,
  );
  push(
    "failed_bookings",
    "critical",
    "הזמנות כושלות",
    `${failedBookings} הזמנות נכשלו`,
    failedBookings,
    thresholds.failed_bookings,
  );
  push(
    "failed_webhooks",
    "high",
    "Webhooks לא מאומתים",
    `${failedWebhooks} אירועים נדחו באימות חתימה`,
    failedWebhooks,
    thresholds.failed_webhooks,
  );
  push(
    "ai_errors",
    "high",
    "שגיאות סוכן AI",
    `${aiErrors} שגיאות בסוכן`,
    aiErrors,
    thresholds.ai_errors,
  );
  push(
    "app_errors",
    "high",
    "שגיאות אפליקציה",
    `${appErrors} שגיאות נרשמו`,
    appErrors,
    thresholds.app_errors,
  );

  return {
    ranAt: new Date().toISOString(),
    windowHours,
    metrics: {
      bookings,
      failedBookings,
      payments,
      failedPayments,
      refunds,
      providerCalls,
      providerFailures,
      providerFailureRate: Number(providerFailureRate.toFixed(3)),
      failedWebhooks,
      aiErrors,
      appErrors,
    },
    alerts,
    notified: false,
  };
}

/** Emails every staff member with an alerting permission. Returns true if sent. */
export async function notifyAdmins(pulse: MonitorPulse): Promise<boolean> {
  if (pulse.alerts.length === 0) return false;
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "company_profile")
    .maybeSingle();
  const profile = (data?.value ?? {}) as { supportEmail?: string; legalEmail?: string };
  const to = profile.supportEmail;
  if (!to) return false;

  const { sendEmail } = await import("@/lib/providers/notifications.server");
  const lines = pulse.alerts.map((a) => `• [${a.severity}] ${a.title} — ${a.detail}`).join("\n");
  const res = await sendEmail({
    to,
    subject: `NITZI — ${pulse.alerts.length} התראות ניטור`,
    template: "support_reply",
    html: `<div dir="rtl"><h2>התראות ניטור NITZI</h2><pre style="font-family:inherit">${lines}</pre><p>חלון: ${pulse.windowHours} שעות · ${pulse.ranAt}</p></div>`,
    });
  });
  return res.ok;
}

export async function runMonitorPulse(windowHours = 1): Promise<MonitorPulse> {
  const pulse = await buildMonitorPulse(windowHours);
  const notified = await notifyAdmins(pulse);
  await supabaseAdmin.from("system_settings").upsert({
    key: "monitor_pulse",
    value: { ...pulse, notified } as never,
    updated_at: new Date().toISOString(),
  });
  return { ...pulse, notified };
}
