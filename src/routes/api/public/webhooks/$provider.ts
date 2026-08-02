// Provider webhooks — public endpoint, signature-verified.
//
// URL: /api/public/webhooks/{provider}   (stripe | hyp)
// Every event is stored in provider_webhook_events with its verification
// status. Only verified events mutate payment or booking state, and each
// external event id is processed exactly once.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const providerId = params.provider;
        const { PAYMENT_ADAPTERS } = await import("@/lib/providers/payment-adapters.server");
        const adapter = PAYMENT_ADAPTERS[providerId];
        if (!adapter) return new Response("Unknown provider", { status: 404 });

        const rawBody = await request.text();
        if (rawBody.length > 1_000_000) return new Response("Payload too large", { status: 413 });

        const verification = await adapter.verifyWebhook(rawBody, request.headers);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { error: insertError } = await supabaseAdmin.from("provider_webhook_events").insert({
          provider_id: providerId,
          event_type: verification.eventType || "unknown",
          external_id: verification.externalId || crypto.randomUUID(),
          verified: verification.verified,
          processed: false,
          payload: (verification.verified ? verification.payload : {}) as never,
          error_message: verification.reason ?? null,
        });
        // Duplicate external id = already delivered; acknowledge without reprocessing.
        if (insertError?.code === "23505") return new Response("duplicate", { status: 200 });

        if (!verification.verified) return new Response("Invalid signature", { status: 401 });

        const { applyPaymentWebhook } = await import("@/lib/providers/webhook-handlers.server");
        try {
          await applyPaymentWebhook(providerId, verification);
          await supabaseAdmin
            .from("provider_webhook_events")
            .update({ processed: true })
            .eq("external_id", verification.externalId);
        } catch (err) {
          await supabaseAdmin
            .from("provider_webhook_events")
            .update({ error_message: err instanceof Error ? err.message : "processing failed" })
            .eq("external_id", verification.externalId);
          return new Response("processing error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
