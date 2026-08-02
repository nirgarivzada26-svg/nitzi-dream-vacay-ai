// Launch gate — server only.
//
// LIVE_MODE alone is not enough to reach real suppliers: the last recorded
// launch checklist must have passed in full. The gate is persisted in
// system_settings so it survives deploys, and cached briefly so provider
// calls don't hit the database on every request.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const LAUNCH_GATE_KEY = "launch_gate";

export interface LaunchGateRecord {
  open: boolean;
  ranAt: string;
  pass: number;
  warn: number;
  fail: number;
  blockers: string[];
}

let cache: { value: LaunchGateRecord | null; at: number } | null = null;
const TTL_MS = 60_000;

export async function readLaunchGate(force = false): Promise<LaunchGateRecord | null> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", LAUNCH_GATE_KEY)
    .maybeSingle();
  const value = (data?.value ?? null) as LaunchGateRecord | null;
  cache = { value, at: Date.now() };
  return value;
}

export async function writeLaunchGate(record: LaunchGateRecord, actorId: string) {
  const { error } = await supabaseAdmin.from("system_settings").upsert({
    key: LAUNCH_GATE_KEY,
    value: record as never,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  cache = { value: record, at: Date.now() };
}

/** True only when a full-pass checklist was recorded. */
export async function launchGateOpen(): Promise<boolean> {
  const gate = await readLaunchGate();
  return Boolean(gate?.open);
}
