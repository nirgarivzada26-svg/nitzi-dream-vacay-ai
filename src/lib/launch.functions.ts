// Launch checklist — admin server functions.

import { createServerFn } from "@tanstack/react-start";
import type { LaunchReport } from "./launch/launch-types";
import type { LaunchGateRecord } from "./launch/launch-gate.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface LaunchState {
  report: LaunchReport | null;
  gate: LaunchGateRecord | null;
  liveMode: boolean;
}

/** Reads the last recorded gate without re-running the (slow) checks. */
export const getLaunchState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LaunchState> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const { readLaunchGate } = await import("./launch/launch-gate.server");
    const { liveMode } = await import("./providers/live-registry.server");
    return { report: null, gate: await readLaunchGate(true), liveMode: liveMode() };
  });

/** Runs every checklist item for real and records the resulting gate. */
export const runLaunchChecklistFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LaunchState> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const { runLaunchChecklist } = await import("./launch/launch-checks.server");
    const { writeLaunchGate } = await import("./launch/launch-gate.server");

    const report = await runLaunchChecklist();
    const gate: LaunchGateRecord = {
      open: report.gateOpen,
      ranAt: report.ranAt,
      pass: report.totals.pass,
      warn: report.totals.warn,
      fail: report.totals.fail,
      blockers: report.blockers,
    };
    await writeLaunchGate(gate, context.userId);
    await admin.logAudit({
      actorId: context.userId,
      action: report.gateOpen ? "launch.gate_opened" : "launch.gate_blocked",
      resource: "launch_checklist",
      newValue: gate as unknown as Record<string, unknown>,
    });
    return { report, gate, liveMode: report.liveMode };
  });
