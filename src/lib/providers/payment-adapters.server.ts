// Payment adapters — server only. Full lifecycle: authorize → capture →
// refund / cancel, each idempotent and each writing to payment_transactions
// through the payment service (see payments.server.ts).

import type {
  PaymentProviderAdapter,
  PaymentRequest,
  PaymentResult,
  WebhookVerification,
} from "./contracts";
import { notConfigured, providerFail, providerOk } from "./contracts";
import { configured, env, httpJson, missing } from "./credentials.server";

const STRIPE_ENV = ["STRIPE_SECRET_KEY"];
const HYP_ENV = ["HYP_TERMINAL", "HYP_PASSWORD"];

function form(body: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) if (v !== undefined) p.set(k, String(v));
  return p.toString();
}

const STRIPE_STATUS: Record<string, PaymentResult["status"]> = {
  requires_capture: "authorized",
  succeeded: "captured",
  canceled: "cancelled",
  processing: "pending",
};

async function stripeCall(
  path: string,
  body: Record<string, string | number | undefined>,
  idempotencyKey: string,
): Promise<{ status: number; body: unknown }> {
  return httpJson(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: form(body),
  });
}

function stripeResult(
  raw: Record<string, unknown>,
  fallback: PaymentResult["status"],
): PaymentResult {
  const status = STRIPE_STATUS[String(raw["status"] ?? "")] ?? fallback;
  const amount = Number(raw["amount"] ?? raw["amount_received"] ?? 0) / 100;
  return {
    status,
    reference: String(raw["id"] ?? ""),
    amount,
    currency: "ILS",
    providerId: "stripe",
    raw,
  };
}

export const stripePaymentAdapter: PaymentProviderAdapter = {
  descriptor: {
    id: "stripe",
    kind: "payment",
    label: "Stripe",
    requiredEnv: [...STRIPE_ENV, "STRIPE_WEBHOOK_SECRET"],
  },
  isConfigured: () => configured(STRIPE_ENV),
  async authorize(req) {
    if (!configured(STRIPE_ENV)) return providerFail("stripe", notConfigured("stripe"));
    const res = await stripeCall(
      "payment_intents",
      {
        amount: Math.round(req.amount * 100),
        currency: "ils",
        capture_method: "manual",
        description: req.description,
        "metadata[booking_id]": req.bookingId ?? undefined,
        "metadata[user_id]": req.userId ?? undefined,
      },
      req.idempotencyKey,
    );
    if (res.status >= 400)
      return providerFail("stripe", {
        code: "upstream_error",
        message: `Stripe ${res.status}`,
        retryable: false,
      });
    return providerOk("stripe", stripeResult(res.body as Record<string, unknown>, "authorized"));
  },
  async capture(req) {
    if (!configured(STRIPE_ENV)) return providerFail("stripe", notConfigured("stripe"));
    if (!req.reference)
      return providerFail("stripe", {
        code: "validation_failed",
        message: "חסר מזהה עסקה לחיוב",
        retryable: false,
      });
    const res = await stripeCall(
      `payment_intents/${req.reference}/capture`,
      { amount_to_capture: Math.round(req.amount * 100) },
      `${req.idempotencyKey}:capture`,
    );
    if (res.status >= 400)
      return providerFail("stripe", {
        code: "upstream_error",
        message: `Stripe ${res.status}`,
        retryable: false,
      });
    return providerOk("stripe", stripeResult(res.body as Record<string, unknown>, "captured"));
  },
  async refund(req) {
    if (!configured(STRIPE_ENV)) return providerFail("stripe", notConfigured("stripe"));
    const res = await stripeCall(
      "refunds",
      { payment_intent: req.reference, amount: Math.round(req.amount * 100) },
      `${req.idempotencyKey}:refund`,
    );
    if (res.status >= 400)
      return providerFail("stripe", {
        code: "upstream_error",
        message: `Stripe ${res.status}`,
        retryable: false,
      });
    const raw = res.body as Record<string, unknown>;
    return providerOk("stripe", {
      status: "refunded",
      reference: String(raw["id"] ?? ""),
      amount: Number(raw["amount"] ?? 0) / 100,
      currency: "ILS",
      providerId: "stripe",
      raw,
    });
  },
  async cancel(req) {
    if (!configured(STRIPE_ENV)) return providerFail("stripe", notConfigured("stripe"));
    const res = await stripeCall(
      `payment_intents/${req.reference}/cancel`,
      {},
      `${req.idempotencyKey}:cancel`,
    );
    if (res.status >= 400)
      return providerFail("stripe", {
        code: "upstream_error",
        message: `Stripe ${res.status}`,
        retryable: false,
      });
    return providerOk("stripe", stripeResult(res.body as Record<string, unknown>, "cancelled"));
  },
  async verifyWebhook(rawBody, headers) {
    const secret = env("STRIPE_WEBHOOK_SECRET");
    const header = headers.get("stripe-signature") ?? "";
    const parts = Object.fromEntries(
      header.split(",").map((kv) => {
        const [k, v] = kv.split("=");
        return [k?.trim() ?? "", v ?? ""];
      }),
    );
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!secret || !timestamp || !signature)
      return { verified: false, eventType: "", externalId: "", payload: {}, reason: "חתימה חסרה" };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    );
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // constant-time compare
    let diff = expected.length ^ signature.length;
    for (let i = 0; i < Math.max(expected.length, signature.length); i++) {
      diff |= (expected.charCodeAt(i) || 0) ^ (signature.charCodeAt(i) || 0);
    }
    if (diff !== 0)
      return { verified: false, eventType: "", externalId: "", payload: {}, reason: "חתימה שגויה" };

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    return {
      verified: true,
      eventType: String(payload["type"] ?? ""),
      externalId: String(payload["id"] ?? ""),
      payload,
    };
  },
};

/**
 * Hyp (Yaad Sarig) — Israeli acquirer. Endpoints are live-only and require a
 * production terminal; the adapter reports not_configured until the terminal
 * credentials are provisioned.
 */
export const hypPaymentAdapter: PaymentProviderAdapter = {
  descriptor: { id: "hyp", kind: "payment", label: "Hyp / יעד שריג", requiredEnv: HYP_ENV },
  isConfigured: () => configured(HYP_ENV),
  async authorize() {
    return providerFail("hyp", notConfigured("hyp"));
  },
  async capture() {
    return providerFail("hyp", notConfigured("hyp"));
  },
  async refund() {
    return providerFail("hyp", notConfigured("hyp"));
  },
  async cancel() {
    return providerFail("hyp", notConfigured("hyp"));
  },
  async verifyWebhook() {
    return {
      verified: false,
      eventType: "",
      externalId: "",
      payload: {},
      reason: "Hyp אינו מוגדר",
    };
  },
};

export const PAYMENT_ADAPTERS: Record<string, PaymentProviderAdapter> = {
  stripe: stripePaymentAdapter,
  hyp: hypPaymentAdapter,
};

export function paymentAdapterStatuses() {
  return Object.values(PAYMENT_ADAPTERS).map((a) => ({
    ...a.descriptor,
    configured: a.isConfigured(),
    missingEnv: missing(a.descriptor.requiredEnv),
  }));
}
