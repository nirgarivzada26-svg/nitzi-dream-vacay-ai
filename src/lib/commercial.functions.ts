// Commercial launch — admin server functions.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CommercialGateRecord,
  CommercialReport,
  MonitorPulse,
} from "./launch/commercial-types";

export interface CommercialState {
  report: CommercialReport | null;
  gate: CommercialGateRecord | null;
  liveMode: boolean;
  pulse: MonitorPulse | null;
}

export const getCommercialState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommercialState> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const { readCommercialGate } = await import("./launch/commercial-gate.server");
    const { liveMode } = await import("./providers/live-registry.server");
    const { buildMonitorPulse } = await import("./launch/monitor.server");
    return {
      report: null,
      gate: await readCommercialGate(true),
      liveMode: liveMode(),
      pulse: await buildMonitorPulse(24),
    };
  });

export const runCommercialChecklistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommercialState> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const { runCommercialChecklist } = await import("./launch/commercial-checks.server");
    const { writeCommercialGate } = await import("./launch/commercial-gate.server");
    const { buildMonitorPulse } = await import("./launch/monitor.server");

    const report = await runCommercialChecklist();
    const gate: CommercialGateRecord = {
      open: report.gateOpen,
      ranAt: report.ranAt,
      pass: report.totals.pass,
      warn: report.totals.warn,
      fail: report.totals.fail,
      blockers: report.blockers,
    };
    await writeCommercialGate(gate, context.userId);
    await admin.logAudit({
      actorId: context.userId,
      action: report.gateOpen ? "commercial.gate_opened" : "commercial.gate_blocked",
      resource: "commercial_checklist",
      newValue: gate as unknown as Record<string, unknown>,
    });
    return { report, gate, liveMode: report.liveMode, pulse: await buildMonitorPulse(24) };
  });

export const runMonitorPulseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ windowHours: z.number().int().min(1).max(168).default(24) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<MonitorPulse> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const { runMonitorPulse } = await import("./launch/monitor.server");
    return runMonitorPulse(data.windowHours);
  });
