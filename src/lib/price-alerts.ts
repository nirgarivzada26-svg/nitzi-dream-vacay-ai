// Price alerts — one per (user, deal). Purely user-owned rows guarded by RLS.

import { supabase } from "@/integrations/supabase/client";

export interface PriceAlertRow {
  id: string;
  deal_id: string;
  destination_name: string;
  target_price: number;
  baseline_price: number;
  active: boolean;
  created_at: string;
}

export async function listPriceAlerts(): Promise<PriceAlertRow[]> {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PriceAlertRow[];
}

export async function getPriceAlert(dealId: string): Promise<PriceAlertRow | null> {
  const { data } = await supabase
    .from("price_alerts")
    .select("*")
    .eq("deal_id", dealId)
    .maybeSingle();
  return (data ?? null) as PriceAlertRow | null;
}

export async function upsertPriceAlert(input: {
  dealId: string;
  destinationName: string;
  targetPrice: number;
  baselinePrice: number;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("צריך להתחבר כדי לפתוח התראת מחיר");
  const target = Math.round(input.targetPrice);
  if (!Number.isFinite(target) || target <= 0 || target >= 1_000_000) {
    throw new Error("מחיר יעד לא תקין");
  }
  const { error } = await supabase.from("price_alerts").upsert(
    {
      user_id: user.id,
      deal_id: input.dealId,
      destination_name: input.destinationName,
      target_price: target,
      baseline_price: Math.round(input.baselinePrice),
      active: true,
    },
    { onConflict: "user_id,deal_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deletePriceAlert(dealId: string): Promise<void> {
  const { error } = await supabase.from("price_alerts").delete().eq("deal_id", dealId);
  if (error) throw error;
}
