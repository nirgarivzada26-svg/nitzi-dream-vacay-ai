// Notification service — server only. Email + SMS with a delivery log.

import type { EmailMessage, ProviderResult, DeliveryResult, SmsMessage } from "./contracts";
import { runWithFailover } from "./failover.server";
import { emailChain, smsChain } from "./live-registry.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function log(
  channel: "email" | "sms" | "whatsapp",
  recipient: string,
  template: string,
  result: ProviderResult<DeliveryResult>,
  userId: string | null,
) {
  try {
    await supabaseAdmin.from("notification_log").insert({
      channel,
      recipient,
      template,
      provider_id: result.providerId,
      status: result.ok ? result.data.status : "failed",
      error_message: result.ok ? null : result.error.message,
      user_id: userId,
      context: {} as never,
    });
  } catch (err) {
    console.error("[nitzi] notification log failed", err);
  }
}

export async function sendEmail(message: EmailMessage) {
  const result = await runWithFailover("email", "send", emailChain(), (a) => a.send(message), {
    template: message.template,
  });
  await log("email", message.to, message.template, result, message.userId ?? null);
  return result;
}

export async function sendSms(message: SmsMessage) {
  const result = await runWithFailover("sms", "send", smsChain(), (a) => a.send(message), {
    template: message.template,
  });
  await log(message.channel, message.to, message.template, result, message.userId ?? null);
  return result;
}
