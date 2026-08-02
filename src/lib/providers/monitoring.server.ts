// Provider monitoring — server only.
//
// Every provider call goes through `instrument`, which measures latency and
// writes one row to public.provider_events. The admin "בריאות ספקים" screen
// reads those rows; nothing is estimated or invented.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProviderError, ProviderKind, ProviderResult } from "./contracts";

export interface ProviderEventInput {
  kind: ProviderKind;
  providerId: string;
  operation: string;
  ok: boolean;
  latencyMs: number;
  error?: ProviderError | null;
  context?: Record<string, unknown>;
}

export async function recordProviderEvent(event: ProviderEventInput): Promise<void> {
  try {
    await supabaseAdmin.from("provider_events").insert({
      provider_kind: event.kind,
      provider_id: event.providerId,
      operation: event.operation,
      ok: event.ok,
      latency_ms: Math.round(event.latencyMs),
      error_code: event.error?.code ?? null,
      error_message: event.error?.message ?? null,
      context: (event.context ?? {}) as never,
    });
  } catch (err) {
    // Monitoring must never break a booking or a search.
    console.error("[nitzi] provider event log failed", err);
  }
}

/** Wraps one provider call: times it, normalizes throws, logs the outcome. */
export async function instrument<T>(
  meta: {
    kind: ProviderKind;
    providerId: string;
    operation: string;
    context?: Record<string, unknown>;
  },
  run: () => Promise<ProviderResult<T>>,
): Promise<ProviderResult<T>> {
  const started = Date.now();
  let result: ProviderResult<T>;
  try {
    result = await run();
  } catch (err) {
    result = {
      ok: false,
      providerId: meta.providerId,
      latencyMs: Date.now() - started,
      error: {
        code: "upstream_error",
        message: err instanceof Error ? err.message : "שגיאת ספק לא ידועה",
        retryable: true,
      },
    };
  }
  const latencyMs = result.latencyMs || Date.now() - started;
  const withLatency = { ...result, latencyMs } as ProviderResult<T>;
  await recordProviderEvent({
    kind: meta.kind,
    providerId: meta.providerId,
    operation: meta.operation,
    ok: withLatency.ok,
    latencyMs,
    error: withLatency.ok ? null : withLatency.error,
    context: meta.context,
  });
  return withLatency;
}

/* --------------------------------------------------------------- metrics */

export interface ProviderMetricRow {
  kind: string;
  providerId: string;
  calls: number;
  failures: number;
  failureRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
}

export interface OperationFailureRow {
  operation: string;
  failures: number;
  lastMessage: string | null;
}

export interface ProviderHealth {
  windowHours: number;
  totalCalls: number;
  totalFailures: number;
  providers: ProviderMetricRow[];
  failuresByOperation: OperationFailureRow[];
}

export async function buildProviderHealth(windowHours = 24): Promise<ProviderHealth> {
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("provider_events")
    .select("provider_kind, provider_id, operation, ok, latency_ms, error_message, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const byProvider = new Map<
    string,
    {
      kind: string;
      providerId: string;
      lat: number[];
      failures: number;
      lastErrorAt: string | null;
      lastErrorMessage: string | null;
    }
  >();
  const byOperation = new Map<string, OperationFailureRow>();

  for (const r of rows) {
    const key = `${r.provider_kind}|${r.provider_id}`;
    const entry = byProvider.get(key) ?? {
      kind: r.provider_kind,
      providerId: r.provider_id,
      lat: [],
      failures: 0,
      lastErrorAt: null as string | null,
      lastErrorMessage: null as string | null,
    };
    entry.lat.push(r.latency_ms ?? 0);
    if (!r.ok) {
      entry.failures += 1;
      if (!entry.lastErrorAt) {
        entry.lastErrorAt = r.created_at;
        entry.lastErrorMessage = r.error_message;
      }
      const op = byOperation.get(r.operation) ?? {
        operation: r.operation,
        failures: 0,
        lastMessage: null as string | null,
      };
      op.failures += 1;
      op.lastMessage = op.lastMessage ?? r.error_message;
      byOperation.set(r.operation, op);
    }
    byProvider.set(key, entry);
  }

  const providers: ProviderMetricRow[] = Array.from(byProvider.values()).map((e) => {
    const sorted = [...e.lat].sort((a, b) => a - b);
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length
      ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0)
      : 0;
    return {
      kind: e.kind,
      providerId: e.providerId,
      calls: e.lat.length,
      failures: e.failures,
      failureRate: e.lat.length ? e.failures / e.lat.length : 0,
      avgLatencyMs: Math.round(avg),
      p95LatencyMs: Math.round(p95),
      lastErrorAt: e.lastErrorAt,
      lastErrorMessage: e.lastErrorMessage,
    };
  });
  providers.sort((a, b) => b.calls - a.calls);

  return {
    windowHours,
    totalCalls: rows.length,
    totalFailures: rows.filter((r) => !r.ok).length,
    providers,
    failuresByOperation: Array.from(byOperation.values()).sort((a, b) => b.failures - a.failures),
  };
}
