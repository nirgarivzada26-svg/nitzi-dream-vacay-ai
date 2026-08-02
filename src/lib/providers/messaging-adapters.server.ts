// Email / SMS adapters — server only.
//
// Email goes through Lovable's managed email API; SMS through Twilio. Every
// send is written to notification_log by the notification service.

import type { DeliveryResult, EmailProviderAdapter, SmsProviderAdapter } from "./contracts";
import { notConfigured, providerFail, providerOk } from "./contracts";
import { configured, env, httpJson, missing } from "./credentials.server";

const EMAIL_ENV = ["LOVABLE_API_KEY", "NITZI_EMAIL_FROM"];
const TWILIO_ENV = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"];

export const lovableEmailAdapter: EmailProviderAdapter = {
  descriptor: { id: "lovable-email", kind: "email", label: "NITZI Email", requiredEnv: EMAIL_ENV },
  isConfigured: () => configured(EMAIL_ENV),
  async send(message) {
    if (!configured(EMAIL_ENV))
      return providerFail("lovable-email", notConfigured("lovable-email"));
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    const res = await sendLovableEmail(
      {
        from: env("NITZI_EMAIL_FROM")!,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        label: message.template,
      },
      { apiKey: env("LOVABLE_API_KEY")! },
    );
    const result: DeliveryResult = {
      messageId: res.message_id ?? "",
      status: res.success ? "sent" : "skipped",
      providerId: "lovable-email",
    };
    return providerOk("lovable-email", result);
  },
};

export const twilioSmsAdapter: SmsProviderAdapter = {
  descriptor: {
    id: "twilio",
    kind: "sms",
    label: "Twilio SMS / WhatsApp",
    requiredEnv: TWILIO_ENV,
  },
  isConfigured: () => configured(TWILIO_ENV),
  async send(message) {
    if (!configured(TWILIO_ENV)) return providerFail("twilio", notConfigured("twilio"));
    const sid = env("TWILIO_ACCOUNT_SID")!;
    const from = env("TWILIO_FROM")!;
    const prefix = message.channel === "whatsapp" ? "whatsapp:" : "";
    const res = await httpJson(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${env("TWILIO_AUTH_TOKEN")}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `${prefix}${message.to}`,
        From: `${prefix}${from}`,
        Body: message.body,
      }).toString(),
    });
    if (res.status >= 400)
      return providerFail("twilio", {
        code: "upstream_error",
        message: `Twilio ${res.status}`,
        retryable: true,
      });
    const raw = res.body as { sid?: string };
    return providerOk("twilio", {
      messageId: raw?.sid ?? "",
      status: "sent",
      providerId: "twilio",
    });
  },
};

export const EMAIL_ADAPTERS: Record<string, EmailProviderAdapter> = {
  "lovable-email": lovableEmailAdapter,
};
export const SMS_ADAPTERS: Record<string, SmsProviderAdapter> = { twilio: twilioSmsAdapter };

export function messagingAdapterStatuses() {
  return [...Object.values(EMAIL_ADAPTERS), ...Object.values(SMS_ADAPTERS)].map((a) => ({
    ...a.descriptor,
    configured: a.isConfigured(),
    missingEnv: missing(a.descriptor.requiredEnv),
  }));
}
