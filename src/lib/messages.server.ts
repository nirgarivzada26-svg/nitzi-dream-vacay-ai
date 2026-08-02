// Transactional message catalog — server only.
//
// One place that owns every customer-facing email and SMS/WhatsApp template:
// what it is called, who sends it, and how its body is built. The commercial
// launch checklist verifies each entry here has a real sender, and the app
// code calls these helpers instead of hand-rolling messages.

import type { EmailTemplate, SmsTemplate } from "./providers/contracts";
import { sendEmail, sendSms } from "./providers/notifications.server";

export interface MessageSpec {
  id: string;
  label: string;
  channel: "email" | "sms";
  emailTemplate?: EmailTemplate;
  smsTemplate?: SmsTemplate;
  /** Where in the product this message is triggered from. */
  trigger: string;
}

export const MESSAGE_CATALOG: MessageSpec[] = [
  {
    id: "email.booking_confirmation",
    label: "אישור הזמנה (אימייל)",
    channel: "email",
    emailTemplate: "booking_confirmation",
    trigger: "סיום צ׳קאאוט מוצלח",
  },
  {
    id: "email.invoice",
    label: "חשבונית",
    channel: "email",
    emailTemplate: "invoice",
    trigger: "לאחר חיוב מוצלח",
  },
  {
    id: "email.voucher",
    label: "שובר (Voucher)",
    channel: "email",
    emailTemplate: "voucher",
    trigger: "לאחר אישור הספק",
  },
  {
    id: "email.password_reset",
    label: "איפוס סיסמה",
    channel: "email",
    emailTemplate: "password_reset",
    trigger: "בקשת איפוס במסך ההתחברות",
  },
  {
    id: "email.price_alert",
    label: "התראת מחיר",
    channel: "email",
    emailTemplate: "price_alert",
    trigger: "ירידת מחיר בדיל שנשמר",
  },
  {
    id: "email.support_reply",
    label: "מענה תמיכה",
    channel: "email",
    emailTemplate: "support_reply",
    trigger: "מענה לפנייה במרכז התמיכה",
  },
  {
    id: "sms.booking_confirmation",
    label: "אישור הזמנה (SMS)",
    channel: "sms",
    smsTemplate: "booking_confirmation",
    trigger: "סיום צ׳קאאוט מוצלח",
  },
  {
    id: "sms.flight_changed",
    label: "שינוי בטיסה",
    channel: "sms",
    smsTemplate: "flight_changed",
    trigger: "webhook שינוי לוח זמנים מהספק",
  },
  {
    id: "sms.price_alert",
    label: "התראת מחיר (SMS)",
    channel: "sms",
    smsTemplate: "price_alert",
    trigger: "ירידת מחיר בדיל שנשמר",
  },
  {
    id: "sms.departure_reminder",
    label: "תזכורת יציאה",
    channel: "sms",
    smsTemplate: "departure_reminder",
    trigger: "48 שעות לפני היציאה",
  },
  {
    id: "sms.support_message",
    label: "הודעת תמיכה",
    channel: "sms",
    smsTemplate: "support_message",
    trigger: "עדכון יזום מצוות התמיכה",
  },
];

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html dir="rtl" lang="he"><body style="font-family:system-ui,Arial;background:#f7f7f8;padding:24px">
<div style="max-width:640px;margin:auto;background:#fff;border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${title}</h1>
${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#777">NITZI · החיים קצרים. תצא לחוות.</p>
</div></body></html>`;
}

/* ------------------------------------------------------------- senders */

export function sendBookingConfirmationEmail(args: {
  to: string;
  userId?: string | null;
  reference: string;
  html: string;
}) {
  return sendEmail({
    to: args.to,
    template: "booking_confirmation",
    subject: `אישור הזמנה ${args.reference} · NITZI`,
    html: layout(`ההזמנה ${args.reference} אושרה`, args.html),
    userId: args.userId ?? null,
  });
}

export function sendInvoiceEmail(args: {
  to: string;
  userId?: string | null;
  reference: string;
  html: string;
}) {
  return sendEmail({
    to: args.to,
    template: "invoice",
    subject: `חשבונית להזמנה ${args.reference}`,
    html: layout(`חשבונית · הזמנה ${args.reference}`, args.html),
    userId: args.userId ?? null,
  });
}

export function sendVoucherEmail(args: {
  to: string;
  userId?: string | null;
  reference: string;
  html: string;
}) {
  return sendEmail({
    to: args.to,
    template: "voucher",
    subject: `השובר שלך · הזמנה ${args.reference}`,
    html: layout(`שובר להזמנה ${args.reference}`, args.html),
    userId: args.userId ?? null,
  });
}

export function sendPasswordResetEmail(args: { to: string; link: string }) {
  return sendEmail({
    to: args.to,
    template: "password_reset",
    subject: "איפוס סיסמה · NITZI",
    html: layout(
      "איפוס סיסמה",
      `<p>לחצו על הקישור כדי לבחור סיסמה חדשה. הקישור תקף ל-60 דקות.</p><p><a href="${args.link}">איפוס סיסמה</a></p>`,
    ),
  });
}

export function sendPriceAlertEmail(args: {
  to: string;
  userId?: string | null;
  destination: string;
  oldPrice: number;
  newPrice: number;
  url: string;
}) {
  return sendEmail({
    to: args.to,
    template: "price_alert",
    subject: `ירידת מחיר ל${args.destination}`,
    html: layout(
      `המחיר ל${args.destination} ירד`,
      `<p>מ-${args.oldPrice}₪ ל-${args.newPrice}₪ לאדם.</p><p><a href="${args.url}">לצפייה בדיל</a></p>`,
    ),
    userId: args.userId ?? null,
  });
}

export function sendSupportReplyEmail(args: {
  to: string;
  userId?: string | null;
  ticket: string;
  message: string;
}) {
  return sendEmail({
    to: args.to,
    template: "support_reply",
    subject: `מענה לפנייה ${args.ticket}`,
    html: layout(`פנייה ${args.ticket}`, `<p>${args.message}</p>`),
    userId: args.userId ?? null,
  });
}

export function sendBookingConfirmationSms(args: {
  to: string;
  userId?: string | null;
  reference: string;
  channel?: "sms" | "whatsapp";
}) {
  return sendSms({
    to: args.to,
    template: "booking_confirmation",
    body: `NITZI: ההזמנה ${args.reference} אושרה. הפרטים נשלחו למייל.`,
    channel: args.channel ?? "sms",
    userId: args.userId ?? null,
  });
}

export function sendFlightChangedSms(args: {
  to: string;
  userId?: string | null;
  reference: string;
  detail: string;
  channel?: "sms" | "whatsapp";
}) {
  return sendSms({
    to: args.to,
    template: "flight_changed",
    body: `NITZI: שינוי בטיסה בהזמנה ${args.reference} — ${args.detail}`,
    channel: args.channel ?? "sms",
    userId: args.userId ?? null,
  });
}

export function sendPriceAlertSms(args: {
  to: string;
  userId?: string | null;
  destination: string;
  newPrice: number;
  channel?: "sms" | "whatsapp";
}) {
  return sendSms({
    to: args.to,
    template: "price_alert",
    body: `NITZI: ירידת מחיר ל${args.destination} — ${args.newPrice}₪ לאדם.`,
    channel: args.channel ?? "sms",
    userId: args.userId ?? null,
  });
}

export function sendDepartureReminderSms(args: {
  to: string;
  userId?: string | null;
  reference: string;
  when: string;
  channel?: "sms" | "whatsapp";
}) {
  return sendSms({
    to: args.to,
    template: "departure_reminder",
    body: `NITZI: תזכורת — היציאה בהזמנה ${args.reference} ב-${args.when}.`,
    channel: args.channel ?? "sms",
    userId: args.userId ?? null,
  });
}

export function sendSupportSms(args: {
  to: string;
  userId?: string | null;
  message: string;
  channel?: "sms" | "whatsapp";
}) {
  return sendSms({
    to: args.to,
    template: "support_message",
    body: `NITZI תמיכה: ${args.message}`,
    channel: args.channel ?? "sms",
    userId: args.userId ?? null,
  });
}

/** Sender registry the checklist introspects — every catalog id must resolve. */
export const MESSAGE_SENDERS: Record<string, (...args: never[]) => unknown> = {
  "email.booking_confirmation": sendBookingConfirmationEmail as never,
  "email.invoice": sendInvoiceEmail as never,
  "email.voucher": sendVoucherEmail as never,
  "email.password_reset": sendPasswordResetEmail as never,
  "email.price_alert": sendPriceAlertEmail as never,
  "email.support_reply": sendSupportReplyEmail as never,
  "sms.booking_confirmation": sendBookingConfirmationSms as never,
  "sms.flight_changed": sendFlightChangedSms as never,
  "sms.price_alert": sendPriceAlertSms as never,
  "sms.departure_reminder": sendDepartureReminderSms as never,
  "sms.support_message": sendSupportSms as never,
};
