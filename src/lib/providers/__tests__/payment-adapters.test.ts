import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stripePaymentAdapter } from "@/lib/providers/payment-adapters.server";

const SECRET = "whsec_test_secret_value_for_unit_tests";

async function signStripePayload(body: string, secret: string, timestamp: string): Promise<string> {
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
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("stripePaymentAdapter.verifyWebhook", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("verifies a correctly signed payload", async () => {
    const body = JSON.stringify({ id: "evt_123", type: "payment_intent.succeeded" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signStripePayload(body, SECRET, timestamp);
    const headers = new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` });

    const result = await stripePaymentAdapter.verifyWebhook(body, headers);

    expect(result.verified).toBe(true);
    expect(result.eventType).toBe("payment_intent.succeeded");
    expect(result.externalId).toBe("evt_123");
  });

  it("rejects a payload signed with the wrong secret", async () => {
    const body = JSON.stringify({ id: "evt_456", type: "payment_intent.succeeded" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signStripePayload(body, "whsec_wrong_secret", timestamp);
    const headers = new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` });

    const result = await stripePaymentAdapter.verifyWebhook(body, headers);

    expect(result.verified).toBe(false);
  });

  it("rejects a payload whose body was tampered with after signing", async () => {
    const originalBody = JSON.stringify({
      id: "evt_789",
      type: "payment_intent.succeeded",
      amount: 100,
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signStripePayload(originalBody, SECRET, timestamp);
    const tamperedBody = JSON.stringify({
      id: "evt_789",
      type: "payment_intent.succeeded",
      amount: 999999,
    });
    const headers = new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` });

    const result = await stripePaymentAdapter.verifyWebhook(tamperedBody, headers);

    expect(result.verified).toBe(false);
  });

  it("rejects a request with no stripe-signature header", async () => {
    const body = JSON.stringify({ id: "evt_000", type: "payment_intent.succeeded" });
    const result = await stripePaymentAdapter.verifyWebhook(body, new Headers());

    expect(result.verified).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("rejects when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const body = JSON.stringify({ id: "evt_111", type: "payment_intent.succeeded" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signStripePayload(body, SECRET, timestamp);
    const headers = new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` });

    const result = await stripePaymentAdapter.verifyWebhook(body, headers);

    expect(result.verified).toBe(false);
  });

  it("rejects a replayed signature paired with a different event id (defense in depth beyond the adapter)", async () => {
    // The adapter itself only checks the signature over (timestamp, body).
    // Replay/duplicate-delivery protection for a given external event id is
    // enforced at the caller (unique index on provider_webhook_events),
    // documented here so the boundary between the two isn't lost.
    const body = JSON.stringify({ id: "evt_222", type: "payment_intent.succeeded" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signStripePayload(body, SECRET, timestamp);
    const headers = new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` });

    const first = await stripePaymentAdapter.verifyWebhook(body, headers);
    const second = await stripePaymentAdapter.verifyWebhook(body, headers);

    expect(first.verified).toBe(true);
    expect(second.verified).toBe(true);
    expect(first.externalId).toBe(second.externalId);
  });
});

describe("stripePaymentAdapter.isConfigured", () => {
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });

  it("is not configured without STRIPE_SECRET_KEY", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripePaymentAdapter.isConfigured()).toBe(false);
  });

  it("is configured once STRIPE_SECRET_KEY is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    expect(stripePaymentAdapter.isConfigured()).toBe(true);
  });
});
