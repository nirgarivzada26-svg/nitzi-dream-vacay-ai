// Commercial launch gate — server only.
//
// Mirrors launch-gate.server.ts for the commercial checklist. LIVE_MODE needs
// BOTH gates open: the product checklist (Sprint 9) and this one.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CommercialGateRecord } from "./commercial-types";

export const COMMERCIAL_GATE_KEY = "commercial_gate";

let cache: { value: CommercialGateRecord | null; at: number } | null = null;
const TTL_MS = 60_000;

export async function readCommercialGate(force = false): Promise<CommercialGateRecord | null> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", COMMERCIAL_GATE_KEY)
    .maybeSingle();
  const value = (data?.value ?? null) as CommercialGateRecord | null;
  cache = { value, at: Date.now() };
  return value;
}

export async function writeCommercialGate(record: CommercialGateRecord, actorId: string) {
  const { error } = await supabaseAdmin.from("system_settings").upsert({
    key: COMMERCIAL_GATE_KEY,
    value: record as never,
    updated_by: actorId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  cache = { value: record, at: Date.now() };
}

export async function commercialGateOpen(): Promise<boolean> {
  const gate = await readCommercialGate();
  return Boolean(gate?.open);
}
