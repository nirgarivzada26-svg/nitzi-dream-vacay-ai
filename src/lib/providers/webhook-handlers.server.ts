// Webhook state transitions — server only.
//
// Maps verified provider events onto the payment ledger and booking status.
// Unknown event types are stored but change nothing.

import type { WebhookVerification } from "./contracts";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STRIPE_STATUS: Record<string, { payment: string; booking?: string }> = {
  "payment_intent.amount_capturable_updated": { payment: "authorized" },
  "payment_intent.succeeded": { payment: "captured", booking: "confirmed" },
  "payment_intent.payment_failed": { payment: "failed", booking: "payment_failed" },
  "payment_intent.canceled": { payment: "cancelled", booking: "cancelled" },
  "charge.refunded": { payment: "refunded", booking: "cancelled" },
};

function stripeObjectId(payload: Record<string, unknown>): string | null {
  const data = payload['data'] as { object?: Record<string, unknown> } | undefined;
  const obj = data?.object;
  if (!obj) return null;
  return String(obj['payment_intent'] ?? obj['id'] ?? "") || null;
}

export async function applyPaymentWebhook(
  providerId: string,
  verification: WebhookVerification,
): Promise<void> {
  if (providerId !== "stripe") return;
  const mapping = STRIPE_STATUS[verification.eventType];
  if (!mapping) return;

  const reference = stripeObjectId(verification.payload);
  if (!reference) return;

  const { data: tx } = await supabaseAdmin
    .from("payment_transactions")
    .select("id, booking_id")
    .eq("provider_reference", reference)
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (!tx) return;

  await supabaseAdmin
    .from("payment_transactions")
    .update({ status: mapping.payment })
    .eq("id", tx.id);

  if (mapping.booking && tx.booking_id) {
    await supabaseAdmin
      .from("bookings")
      .update({ status: mapping.booking })
      .eq("id", tx.booking_id);
  }
}
