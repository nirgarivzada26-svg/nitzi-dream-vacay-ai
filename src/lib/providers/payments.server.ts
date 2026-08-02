// Payment lifecycle service — server only.
//
// Every authorize / capture / refund / cancel is written to
// public.payment_transactions BEFORE and AFTER the provider call, keyed by an
// idempotency key. Replaying the same key returns the stored result instead of
// charging twice.

import type { PaymentRequest, PaymentResult, ProviderResult } from "./contracts";
import { providerFail } from "./contracts";
import { runWithFailover } from "./failover.server";
import { paymentChain } from "./live-registry.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Operation = "authorize" | "capture" | "refund" | "cancel";

function ledgerKey(req: PaymentRequest, op: Operation): string {
  return `${req.idempotencyKey}:${op}`;
}

async function findExisting(key: string) {
  const { data } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  return data;
}

export async function runPayment(
  op: Operation,
  req: PaymentRequest,
): Promise<ProviderResult<PaymentResult>> {
  const key = ledgerKey(req, op);

  const existing = await findExisting(key);
  if (existing && existing.status !== "failed" && existing.status !== "pending") {
    return {
      ok: true,
      providerId: existing.provider_id,
      latencyMs: 0,
      data: {
        status: existing.status as PaymentResult["status"],
        reference: existing.provider_reference ?? "",
        amount: Number(existing.amount),
        currency: "ILS",
        providerId: existing.provider_id,
      },
    };
  }

  const chain = paymentChain();
  const providerId = chain.find((c) => c.configured)?.id ?? "none";

  await supabaseAdmin.from("payment_transactions").upsert(
    {
      idempotency_key: key,
      operation: op,
      status: "pending",
      amount: req.amount,
      currency: req.currency,
      provider_id: providerId,
      booking_id: req.bookingId ?? null,
      user_id: req.userId ?? null,
      payload: { method: req.method ?? null, description: req.description ?? null } as never,
    },
    { onConflict: "idempotency_key" },
  );

  const result = await runWithFailover(
    "payment",
    op,
    chain,
    (a) =>
      op === "authorize"
        ? a.authorize(req)
        : op === "capture"
          ? a.capture(req)
          : op === "refund"
            ? a.refund(req)
            : a.cancel(req),
    { bookingId: req.bookingId ?? null },
  );

  await supabaseAdmin
    .from("payment_transactions")
    .update({
      status: result.ok ? result.data.status : "failed",
      provider_id: result.providerId,
      provider_reference: result.ok ? result.data.reference : null,
      error_message: result.ok ? null : result.error.message,
      payload: (result.ok ? (result.data.raw ?? {}) : { error: result.error }) as never,
    })
    .eq("idempotency_key", key);

  return result;
}

export async function authorizePayment(req: PaymentRequest) {
  return runPayment("authorize", req);
}
export async function capturePayment(req: PaymentRequest) {
  return runPayment("capture", req);
}
export async function refundPayment(req: PaymentRequest) {
  return runPayment("refund", req);
}
export async function cancelPayment(req: PaymentRequest) {
  return runPayment("cancel", req);
}

export async function paymentsForBooking(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function noPaymentProvider(): ProviderResult<PaymentResult> {
  return providerFail("none", {
    code: "not_configured",
    message: "לא הוגדר ספק סליקה פעיל",
    retryable: false,
  });
}
