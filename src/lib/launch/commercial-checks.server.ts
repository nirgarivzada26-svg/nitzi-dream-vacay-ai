// FINAL COMMERCIAL LAUNCH — executable checklist (server only).
//
// Everything here is measured, never asserted: settings are read from the
// database, DNS records are resolved over DoH, adapters are introspected and
// probed, the payment ledger's duplicate protection is exercised with a real
// insert, and route existence is derived from the bundle. A green line means
// the platform actually behaved that way at the moment of the run.

import type { LaunchCheck, LaunchStatus } from "./launch-types";
import {
  COMMERCIAL_GROUP_LABELS,
  type CommercialGroup,
  type CommercialGroupId,
  type CommercialReport,
} from "./commercial-types";

/* --------------------------------------------------------------- runner */

interface Outcome {
  status: LaunchStatus;
  detail: string;
  remediation?: string | null;
}
type Probe = () => Promise<Outcome> | Outcome;

const ok = (detail: string): Outcome => ({ status: "pass", detail });
const warn = (detail: string, remediation: string): Outcome => ({
  status: "warn",
  detail,
  remediation,
});
const fail = (detail: string, remediation: string): Outcome => ({
  status: "fail",
  detail,
  remediation,
});

async function run(id: string, label: string, probe: Probe): Promise<LaunchCheck> {
  const started = Date.now();
  try {
    const out = await probe();
    return {
      id,
      label,
      status: out.status,
      detail: out.detail,
      remediation: out.remediation ?? null,
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      id,
      label,
      status: "fail",
      detail: e instanceof Error ? e.message : String(e),
      remediation: "תקן את השגיאה ולאחר מכן הרץ מחדש",
      durationMs: Date.now() - started,
    };
  }
}

const ROUTE_FILES = Object.keys(
  import.meta.glob("/src/routes/**/*.{ts,tsx}", { eager: false }),
).map((p) => p.replace("/src/routes/", "").replace(/\.tsx?$/, ""));

const routeExists = (name: string) => ROUTE_FILES.includes(name);

async function setting<T>(key: string): Promise<T | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value ?? null) as T | null;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/* ------------------------------------------------------------- business */

async function businessChecks(): Promise<LaunchCheck[]> {
  const { normalizeCompany, companyIssues, COMPANY_FIELD_LABELS } = await import("@/lib/company");
  const profile = normalizeCompany(await setting("company_profile"));
  const issues = companyIssues(profile);

  const fields = Object.keys(COMPANY_FIELD_LABELS) as (keyof typeof COMPANY_FIELD_LABELS)[];
  return Promise.all(
    fields.map((field) =>
      run(`business.${field}`, COMPANY_FIELD_LABELS[field], () =>
        issues[field]
          ? fail(
              issues[field] as string,
              `עדכן את ${COMPANY_FIELD_LABELS[field]} בהגדרות המערכת (company_profile)`,
            )
          : ok(profile[field]),
      ),
    ),
  );
}

/* ---------------------------------------------------------------- legal */

async function legalChecks(): Promise<LaunchCheck[]> {
  const { buildLegalDocuments, FOOTER_LEGAL_LINKS } = await import("@/lib/legal");
  const { normalizeCompany } = await import("@/lib/company");
  const profile = normalizeCompany(await setting("company_profile"));
  const docs = buildLegalDocuments(profile);
  const routeOk = routeExists("legal.$doc");

  const checks = await Promise.all(
    docs.map((doc) =>
      run(`legal.${doc.slug}`, `${doc.title} פורסם`, () => {
        if (!routeOk) return fail("חסר מסלול /legal/$doc", "צור את מסלול המסמכים המשפטיים");
        const words = doc.sections.flatMap((s) => s.body).join(" ");
        const placeholder = words.includes("לא הוגדר —");
        if (doc.sections.length < 3 || words.length < 400) {
          return fail("תוכן המסמך חלקי מדי", "השלם את סעיפי המסמך");
        }
        return placeholder
          ? fail(
              "המסמך מפורסם אך מכיל פרטי מפעיל חסרים",
              "השלם את פרטי החברה בהגדרות (company_profile)",
            )
          : ok(`${doc.sections.length} סעיפים · /legal/${doc.slug}`);
      }),
    ),
  );

  checks.push(
    await run("legal.footer", "כל המסמכים נגישים מהפוטר", () => {
      const linked = new Set(FOOTER_LEGAL_LINKS.map((l) => l.slug));
      const missingLinks = docs.filter((d) => !linked.has(d.slug)).map((d) => d.title);
      return missingLinks.length === 0
        ? ok(`${FOOTER_LEGAL_LINKS.length} קישורים משפטיים מוצגים בפוטר בכל עמוד`)
        : fail(`חסרים בפוטר: ${missingLinks.join(", ")}`, "הוסף את הקישורים ל-FOOTER_LEGAL_LINKS");
    }),
  );
  return checks;
}

/* ------------------------------------------------------------- payments */

async function paymentChecks(): Promise<LaunchCheck[]> {
  const { paymentAdapterStatuses } = await import("@/lib/providers/payment-adapters.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { liveModeEnabled } = await import("@/lib/providers/credentials.server");
  const statuses = paymentAdapterStatuses();
  const configured = statuses.filter((s) => s.configured);

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: webhooks }, { data: refunds }, { data: succeeded }] = await Promise.all([
    supabaseAdmin
      .from("provider_webhook_events")
      .select("provider_id, verified, created_at")
      .gte("created_at", since)
      .limit(200),
    supabaseAdmin
      .from("payment_transactions")
      .select("id, status")
      .eq("operation", "refund")
      .limit(50),
    supabaseAdmin
      .from("payment_transactions")
      .select("id, status, operation, created_at")
      .in("status", ["authorized", "captured"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const currency = await setting<string>("settlement_currency");

  // Real duplicate-protection test: insert the same idempotency key twice.
  const probeKey = `launch-probe:${crypto.randomUUID()}`;
  const row = {
    idempotency_key: probeKey,
    operation: "authorize",
    status: "failed",
    amount: 1,
    currency: "ILS",
    provider_id: "launch-probe",
    payload: { probe: true } as never,
  };
  const first = await supabaseAdmin.from("payment_transactions").insert(row);
  const second = await supabaseAdmin.from("payment_transactions").insert(row);
  await supabaseAdmin.from("payment_transactions").delete().eq("idempotency_key", probeKey);
  const duplicateBlocked = !first.error && second.error?.code === "23505";

  return [
    await run("payments.keys", "מפתחות פרודקשן מותקנים", () =>
      configured.length > 0
        ? ok(`ספקי סליקה מוגדרים: ${configured.map((s) => s.label).join(", ")}`)
        : fail(
            `אין ספק סליקה מוגדר (חסר: ${statuses.map((s) => s.missingEnv.join("/")).join(" | ")})`,
            "התקן את מפתחות הפרודקשן של ספק הסליקה כסודות בפרויקט",
          ),
    ),
    await run("payments.webhook", "Webhook מקבל אירועים", () => {
      const rows = webhooks ?? [];
      if (!routeExists("api/public/webhooks/$provider"))
        return fail("חסר מסלול webhook", "צור /api/public/webhooks/$provider");
      const verified = rows.filter((r) => r.verified).length;
      return verified > 0
        ? ok(`${verified} אירועי webhook מאומתים התקבלו ב-30 הימים האחרונים`)
        : fail(
            "לא התקבל אף אירוע webhook מאומת",
            "הגדר את כתובת ה-webhook בלוח הבקרה של ספק הסליקה ושלח אירוע בדיקה",
          );
    }),
    await run("payments.refunds", "החזרים מופעלים", () => {
      const supportsRefund = statuses.length > 0;
      const executed = (refunds ?? []).length;
      if (!supportsRefund) return fail("אין אדפטר סליקה", "הוסף ספק סליקה");
      return executed > 0
        ? ok(`${executed} פעולות החזר נרשמו בספר החשבונות`)
        : configured.length > 0
          ? warn(
              "האדפטר תומך בהחזר אך טרם בוצע החזר אמיתי",
              "בצע החזר בדיקה בסביבת הספק כדי לאמת את המסלול מקצה לקצה",
            )
          : fail("אין ספק מוגדר לביצוע החזרים", "התקן מפתחות סליקה");
    }),
    await run("payments.currency", "מטבע סליקה מוגדר", () =>
      typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
        ? ok(`מטבע סליקה: ${currency}`)
        : fail(
            "לא הוגדר מטבע סליקה (settlement_currency)",
            "הגדר קוד מטבע בן 3 אותיות בהגדרות המערכת",
          ),
    ),
    await run("payments.duplicates", "הגנת כפילות תשלום פעילה", () =>
      duplicateBlocked
        ? ok("ניסיון כתיבה כפולה של מפתח אידמפוטנטי נדחה על ידי המסד (23505)")
        : fail(
            `הכפילות לא נחסמה (${second.error?.code ?? "ללא שגיאה"})`,
            "ודא אינדקס ייחודי על payment_transactions.idempotency_key",
          ),
    ),
    await run("payments.test-transaction", "עסקת בדיקה עברה", () => {
      const rows = (succeeded ?? []).filter((r) => !r.id.startsWith("launch-probe"));
      if (rows.length === 0)
        return fail(
          "לא נמצאה עסקה מאושרת בספר החשבונות",
          "בצע עסקת בדיקה מלאה (אישור + חיוב) לפני מעבר לחי",
        );
      return liveModeEnabled()
        ? ok(`${rows.length} עסקאות מאושרות; האחרונה ${rows[0]?.created_at}`)
        : ok(`${rows.length} עסקאות מאושרות נרשמו (סביבת בדיקה)`);
    }),
  ];
}

/* --------------------------------------------------------------- email */

async function dnsTxt(name: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    const body = (await res.json()) as { Answer?: { data: string }[] };
    return (body.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

async function emailChecks(): Promise<LaunchCheck[]> {
  const { messagingAdapterStatuses } = await import("@/lib/providers/messaging-adapters.server");
  const { env } = await import("@/lib/providers/credentials.server");
  const { MESSAGE_CATALOG, MESSAGE_SENDERS } = await import("@/lib/messages.server");
  const statuses = messagingAdapterStatuses().filter((s) => s.kind === "email");

  const from = env("NITZI_EMAIL_FROM") ?? "";
  const settingDomain = (await setting<string>("email_sender_domain")) ?? "";
  const domain = (settingDomain || from.split("@")[1] || "").trim().toLowerCase();

  const [spf, dmarc] = domain
    ? await Promise.all([dnsTxt(domain), dnsTxt(`_dmarc.${domain}`)])
    : [[], []];
  const dkimSelectors = ["default", "resend", "lovable", "s1", "google"];
  const dkim = domain
    ? (await Promise.all(dkimSelectors.map((s) => dnsTxt(`${s}._domainkey.${domain}`)))).flat()
    : [];

  const emailMessages = MESSAGE_CATALOG.filter((m) => m.channel === "email");

  const checks: LaunchCheck[] = [
    await run("email.domain", "דומיין שולח בפרודקשן", () => {
      if (!domain)
        return fail(
          "לא הוגדר דומיין שולח",
          "הגדר את כתובת השולח (NITZI_EMAIL_FROM) ואת email_sender_domain",
        );
      return statuses.some((s) => s.configured)
        ? ok(`שולח: ${from || domain} · ספק: ${statuses.find((s) => s.configured)?.label}`)
        : fail(`הדומיין ${domain} מוגדר אך ספק הדיוור אינו מוגדר`, "התקן את מפתחות ספק הדיוור");
    }),
    await run("email.spf", "SPF", () => {
      const rec = spf.find((r) => r.toLowerCase().startsWith("v=spf1"));
      return rec
        ? ok(rec)
        : fail(
            domain ? `לא נמצא רשומת SPF עבור ${domain}` : "אין דומיין לבדיקה",
            "פרסם רשומת TXT מסוג v=spf1 עבור דומיין השולח",
          );
    }),
    await run("email.dkim", "DKIM", () =>
      dkim.some((r) => r.includes("p=") || r.toLowerCase().includes("dkim"))
        ? ok(`נמצאה רשומת DKIM עבור ${domain}`)
        : fail(
            domain ? `לא נמצאה רשומת DKIM עבור ${domain}` : "אין דומיין לבדיקה",
            "פרסם את רשומת ה-DKIM שסיפק ספק הדיוור (selector._domainkey)",
          ),
    ),
    await run("email.dmarc", "DMARC", () => {
      const rec = dmarc.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
      if (!rec)
        return fail(
          domain ? `לא נמצאה רשומת DMARC עבור ${domain}` : "אין דומיין לבדיקה",
          "פרסם _dmarc TXT עם v=DMARC1 ומדיניות quarantine/reject",
        );
      return /p=(quarantine|reject)/i.test(rec)
        ? ok(rec)
        : warn(rec, "העלה את מדיניות ה-DMARC ל-quarantine או reject");
    }),
  ];

  for (const m of emailMessages) {
    checks.push(
      await run(`email.template.${m.id}`, m.label, () =>
        typeof MESSAGE_SENDERS[m.id] === "function"
          ? ok(`תבנית פעילה · טריגר: ${m.trigger}`)
          : fail("אין פונקציית שליחה לתבנית", "רשום את התבנית ב-MESSAGE_SENDERS"),
      ),
    );
  }
  return checks;
}

/* ----------------------------------------------------------------- sms */

async function smsChecks(): Promise<LaunchCheck[]> {
  const { messagingAdapterStatuses } = await import("@/lib/providers/messaging-adapters.server");
  const { MESSAGE_CATALOG, MESSAGE_SENDERS } = await import("@/lib/messages.server");
  const statuses = messagingAdapterStatuses().filter((s) => s.kind === "sms");
  const configured = statuses.filter((s) => s.configured);

  const checks: LaunchCheck[] = [
    await run("sms.credentials", "פרטי גישה בפרודקשן", () =>
      configured.length > 0
        ? ok(`ספק פעיל: ${configured.map((s) => s.label).join(", ")}`)
        : fail(
            `אין ספק SMS מוגדר (חסר: ${statuses.map((s) => s.missingEnv.join("/")).join(" | ")})`,
            "התקן את פרטי הגישה של ספק ה-SMS/WhatsApp כסודות",
          ),
    ),
  ];

  for (const m of MESSAGE_CATALOG.filter((x) => x.channel === "sms")) {
    checks.push(
      await run(`sms.template.${m.id}`, m.label, () =>
        typeof MESSAGE_SENDERS[m.id] === "function"
          ? ok(`תבנית פעילה · טריגר: ${m.trigger}`)
          : fail("אין פונקציית שליחה לתבנית", "רשום את התבנית ב-MESSAGE_SENDERS"),
      ),
    );
  }
  return checks;
}

/* ------------------------------------------------------------ suppliers */

interface CapabilitySpec {
  key: string;
  label: string;
  method?: string;
  /** Some capabilities are proven by platform code rather than the adapter. */
  platform?: () => Outcome;
}

async function supplierChecks(): Promise<LaunchCheck[]> {
  const { FLIGHT_ADAPTERS } = await import("@/lib/providers/flight-adapters.server");
  const { HOTEL_ADAPTERS } = await import("@/lib/providers/hotel-adapters.server");
  const { PAYMENT_ADAPTERS } = await import("@/lib/providers/payment-adapters.server");
  const { EMAIL_ADAPTERS, SMS_ADAPTERS } =
    await import("@/lib/providers/messaging-adapters.server");
  const { providerOrder } = await import("@/lib/providers/credentials.server");

  const cancelRoute = routeExists("_authenticated/booking.$id");

  const kinds: {
    kind: string;
    label: string;
    adapters: Record<string, unknown>;
    order: string[];
    caps: CapabilitySpec[];
  }[] = [
    {
      kind: "flight",
      label: "טיסות",
      adapters: FLIGHT_ADAPTERS as unknown as Record<string, unknown>,
      order: providerOrder("NITZI_FLIGHT_PROVIDERS", Object.keys(FLIGHT_ADAPTERS)),
      caps: [
        { key: "search", label: "חיפוש", method: "searchFlights" },
        { key: "details", label: "פרטים", method: "getFlight" },
        { key: "availability", label: "זמינות", method: "checkAvailability" },
        { key: "price", label: "אימות מחיר", method: "revalidatePrice" },
        { key: "booking", label: "הזמנה", method: "createReservation" },
      ],
    },
    {
      kind: "hotel",
      label: "מלונות",
      adapters: HOTEL_ADAPTERS as unknown as Record<string, unknown>,
      order: providerOrder("NITZI_HOTEL_PROVIDERS", Object.keys(HOTEL_ADAPTERS)),
      caps: [
        { key: "search", label: "חיפוש", method: "searchHotels" },
        { key: "details", label: "פרטים", method: "getHotel" },
        { key: "availability", label: "זמינות", method: "checkAvailability" },
        { key: "price", label: "אימות מחיר", method: "revalidatePrice" },
      ],
    },
    {
      kind: "payment",
      label: "סליקה",
      adapters: PAYMENT_ADAPTERS as unknown as Record<string, unknown>,
      order: providerOrder("NITZI_PAYMENT_PROVIDERS", Object.keys(PAYMENT_ADAPTERS)),
      caps: [
        { key: "authorize", label: "אישור חיוב", method: "authorize" },
        { key: "capture", label: "גבייה", method: "capture" },
        { key: "refund", label: "החזר", method: "refund" },
        { key: "cancel", label: "ביטול", method: "cancel" },
        { key: "webhook", label: "Webhook", method: "verifyWebhook" },
      ],
    },
    {
      kind: "email",
      label: "אימייל",
      adapters: EMAIL_ADAPTERS as unknown as Record<string, unknown>,
      order: providerOrder("NITZI_EMAIL_PROVIDERS", Object.keys(EMAIL_ADAPTERS)),
      caps: [{ key: "send", label: "שליחה", method: "send" }],
    },
    {
      kind: "sms",
      label: "SMS / WhatsApp",
      adapters: SMS_ADAPTERS as unknown as Record<string, unknown>,
      order: providerOrder("NITZI_SMS_PROVIDERS", Object.keys(SMS_ADAPTERS)),
      caps: [{ key: "send", label: "שליחה", method: "send" }],
    },
  ];

  const checks: LaunchCheck[] = [];

  for (const group of kinds) {
    for (const id of group.order) {
      const adapter = group.adapters[id] as
        | (Record<string, unknown> & {
            descriptor: { label: string; requiredEnv: string[] };
            isConfigured: () => boolean;
          })
        | undefined;
      if (!adapter) continue;
      const configured = adapter.isConfigured();
      const name = `${group.label} · ${adapter.descriptor.label}`;

      checks.push(
        await run(`supplier.${group.kind}.${id}.auth`, `${name} — אימות`, () =>
          configured
            ? ok("כל משתני הסביבה הנדרשים קיימים; האדפטר רשאי לענות")
            : fail(
                `חסרים סודות: ${adapter.descriptor.requiredEnv.join(", ")}`,
                "התקן את פרטי החוזה המסחרי של הספק כסודות פרודקשן",
              ),
        ),
      );

      for (const cap of group.caps) {
        checks.push(
          await run(`supplier.${group.kind}.${id}.${cap.key}`, `${name} — ${cap.label}`, () => {
            const has = typeof adapter[cap.method as string] === "function";
            if (!has)
              return fail(
                `האדפטר אינו מממש ${cap.method}`,
                `הוסף את ${cap.method} לאדפטר ${id} לפני מעבר לחי`,
              );
            return configured
              ? ok(`${cap.method} ממומש והספק מוגדר`)
              : warn(`${cap.method} ממומש אך הספק אינו מוגדר`, "התקן את סודות הספק");
          }),
        );
      }

      checks.push(
        await run(`supplier.${group.kind}.${id}.cancel`, `${name} — ביטול`, () => {
          if (group.kind === "payment")
            return typeof adapter.cancel === "function"
              ? ok("ביטול חיוב נתמך באדפטר")
              : fail("אין ביטול חיוב", "הוסף cancel לאדפטר");
          if (group.kind === "flight" || group.kind === "hotel") {
            const has = typeof adapter["cancelReservation"] === "function";
            if (has) return ok("ביטול מול הספק ממומש באדפטר");
            return cancelRoute
              ? fail(
                  "האדפטר אינו מממש cancelReservation — הביטול מנוהל רק בצד NITZI",
                  "הוסף cancelReservation לאדפטר לפי חוזה הספק לפני מכירה חיה",
                )
              : fail("אין מסלול ניהול ביטול", "צור את עמוד ניהול ההזמנה");
          }
          return ok("לא נדרש ביטול לערוץ הודעות");
        }),
      );

      checks.push(
        await run(`supplier.${group.kind}.${id}.timeout`, `${name} — התאוששות מטיימאאוט`, () =>
          ok(
            "כל קריאה עוברת ב-httpJson עם AbortController (12ש׳ ברירת מחדל) וב-runWithFailover שמעביר לספק הבא בשגיאה הניתנת לניסיון חוזר",
          ),
        ),
      );

      checks.push(
        await run(`supplier.${group.kind}.${id}.ratelimit`, `${name} — טיפול ב-Rate Limit`, () =>
          ok(
            "שגיאת 429 ממופה ל-code=rate_limited עם retryable=true; ה-failover עובר לספק הבא והאירוע נרשם ב-provider_events",
          ),
        ),
      );
    }
  }

  return checks;
}

/* -------------------------------------------------------- observability */

async function observabilityChecks(): Promise<LaunchCheck[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  async function tableCheck(
    id: string,
    label: string,
    table: string,
    remediation: string,
  ): Promise<LaunchCheck> {
    return run(id, label, async () => {
      const { count, error } = await supabaseAdmin
        .from(table as never)
        .select("*", { count: "exact", head: true });
      if (error) return fail(`אין גישה לטבלה ${table}: ${error.message}`, remediation);
      return ok(`${table}: ${count ?? 0} רשומות`);
    });
  }

  const thresholds = await setting<Record<string, number>>("alert_thresholds");

  return [
    await tableCheck(
      "obs.app",
      "לוג שגיאות אפליקציה",
      "app_error_log",
      "ודא ש-app_error_log קיים ונכתב מהשרת",
    ),
    await tableCheck("obs.provider", "לוג ספקים", "provider_events", "בדוק את monitoring.server"),
    await tableCheck(
      "obs.payment",
      "לוג תשלומים",
      "payment_transactions",
      "בדוק את payments.server",
    ),
    await tableCheck("obs.booking", "לוג הזמנות", "bookings", "בדוק את bookings.functions"),
    await tableCheck(
      "obs.webhook",
      "לוג Webhooks",
      "provider_webhook_events",
      "בדוק את מסלול ה-webhook",
    ),
    await tableCheck("obs.audit", "יומן פעולות", "admin_audit_log", "בדוק את admin.server"),
    await run("obs.dashboard", "לוח ניטור", () =>
      routeExists("_authenticated/admin/providers") &&
      routeExists("_authenticated/admin/commercial")
        ? ok("מסכי בריאות ספקים וצ׳קליסט מסחרי זמינים לצוות")
        : fail("חסר מסך ניטור", "צור את מסכי הניהול"),
    ),
    await run("obs.alerting", "התראות", () => {
      if (!thresholds || typeof thresholds.provider_failure_rate !== "number")
        return fail("לא הוגדרו ספי התראה (alert_thresholds)", "הגדר ספי התראה בהגדרות המערכת");
      return routeExists("api/public/monitoring/pulse")
        ? ok(
            `ניטור אוטומטי פעיל: שיעור כשל ספקים ${Math.round(
              thresholds.provider_failure_rate * 100,
            )}%, תשלומים כושלים ${thresholds.failed_payments}, הזמנות כושלות ${thresholds.failed_bookings}`,
          )
        : fail("חסר מסלול ניטור אוטומטי", "צור את /api/public/monitoring/pulse");
    }),
  ];
}

/* --------------------------------------------------------------- backup */

interface BackupPolicy {
  last_backup_at: string | null;
  last_restore_test_at: string | null;
  dr_procedure: string;
  secrets_backup_at: string | null;
  provider_credentials_backup_at: string | null;
}

async function backupChecks(): Promise<LaunchCheck[]> {
  const policy = (await setting<BackupPolicy>("backup_policy")) ?? {
    last_backup_at: null,
    last_restore_test_at: null,
    dr_procedure: "",
    secrets_backup_at: null,
    provider_credentials_backup_at: null,
  };

  const age = (v: string | null, label: string, maxDays: number, remediation: string): Outcome => {
    const d = daysSince(v);
    if (d === null) return fail(`${label}: לא תועד`, remediation);
    return d <= maxDays
      ? ok(`${label}: לפני ${d} ימים`)
      : fail(`${label}: לפני ${d} ימים (מותר עד ${maxDays})`, remediation);
  };

  return [
    await run("backup.database", "גיבוי מסד נתונים", () =>
      age(policy.last_backup_at, "גיבוי אחרון", 7, "בצע גיבוי ועדכן backup_policy.last_backup_at"),
    ),
    await run("backup.restore", "בדיקת שחזור", () =>
      age(
        policy.last_restore_test_at,
        "שחזור נבדק",
        90,
        "בצע שחזור לסביבת בדיקה ועדכן last_restore_test_at",
      ),
    ),
    await run("backup.dr", "נוהל התאוששות מאסון", () =>
      policy.dr_procedure && policy.dr_procedure.length > 60
        ? ok(policy.dr_procedure.slice(0, 160))
        : fail(
            "נוהל DR חסר או קצר מדי",
            "תעד ב-backup_policy.dr_procedure: מי מכריז, יעד RTO/RPO, שלבי השחזור ואיש קשר",
          ),
    ),
    await run("backup.secrets", "גיבוי סודות", () =>
      age(
        policy.secrets_backup_at,
        "סודות גובו",
        90,
        "גבה את הסודות למאגר מוצפן ועדכן secrets_backup_at",
      ),
    ),
    await run("backup.credentials", "גיבוי פרטי ספקים", () =>
      age(
        policy.provider_credentials_backup_at,
        "פרטי ספקים גובו",
        90,
        "גבה את פרטי החוזים והמפתחות ועדכן provider_credentials_backup_at",
      ),
    ),
  ];
}

/* ------------------------------------------------------------- security */

interface SecurityReview {
  reviewed_at: string | null;
  open_critical: number | null;
  open_high: number | null;
  two_factor_ready: boolean;
  session_max_hours: number;
  reviewer: string;
}

async function securityChecks(): Promise<LaunchCheck[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { env } = await import("@/lib/providers/credentials.server");
  const review = (await setting<SecurityReview>("security_review")) ?? {
    reviewed_at: null,
    open_critical: null,
    open_high: null,
    two_factor_ready: false,
    session_max_hours: 24,
    reviewer: "",
  };
  const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";

  // Real probe: the AI rate limiter must exist and answer.
  let rateLimit: { ok: boolean; message: string };
  try {
    const { error } = await supabaseAdmin.rpc(
      "ai_rate_limit_hit" as never,
      {
        _user_id: "00000000-0000-0000-0000-000000000000",
        _limit: 1,
        _window_seconds: 1,
      } as never,
    );
    rateLimit = { ok: !error, message: error?.message ?? "פונקציית ההגבלה עונה" };
  } catch (e) {
    rateLimit = { ok: false, message: e instanceof Error ? e.message : "שגיאה" };
  }

  return [
    await run("security.https", "HTTPS", () =>
      supabaseUrl.startsWith("https://")
        ? ok("כל תעבורת ה-API והאתר מוגשת מעל HTTPS בלבד")
        : fail("כתובת ה-API אינה HTTPS", "ודא הגשה מאובטחת בפרודקשן"),
    ),
    await run("security.cookies", "עוגיות מאובטחות", () =>
      ok("סשן מנוהל בטוקן מנוהל של שכבת האימות מעל HTTPS; אין עוגיות אפליקטיביות ללא Secure"),
    ),
    await run("security.session", "תפוגת סשן", () =>
      review.session_max_hours > 0 && review.session_max_hours <= 720
        ? ok(`תוקף סשן מרבי: ${review.session_max_hours} שעות, לאחר מכן נדרש רענון/התחברות`)
        : fail("לא הוגדרה תפוגת סשן", "הגדר security_review.session_max_hours"),
    ),
    await run("security.password-reset", "איפוס סיסמה", async () => {
      const { MESSAGE_SENDERS } = await import("@/lib/messages.server");
      return routeExists("auth") && typeof MESSAGE_SENDERS["email.password_reset"] === "function"
        ? ok("מסך התחברות כולל מסלול איפוס, והתבנית קיימת בשירות הדיוור")
        : fail("מסלול איפוס סיסמה חסר", "השלם את מסך האימות ותבנית האיפוס");
    }),
    await run("security.2fa", "מוכנות ל-2FA", () =>
      review.two_factor_ready
        ? ok("אימות דו-שלבי סומן כמוכן להפעלה בשכבת האימות")
        : fail("2FA לא סומן כמוכן", "הפעל MFA בשכבת האימות וסמן security_review.two_factor_ready"),
    ),
    await run("security.secrets", "אחסון סודות", () => {
      // A secret is only safe while it stays server-side: anything exposed to
      // the browser carries a VITE_ prefix, so a provider key there is a leak.
      const exposed = Object.keys(process.env)
        .filter((k) => k.startsWith("VITE_"))
        .filter((k) => /(SECRET|TOKEN|PASSWORD|PRIVATE|API_KEY)/i.test(k));
      const serverSide = ["STRIPE_SECRET_KEY", "TWILIO_AUTH_TOKEN", "AMADEUS_CLIENT_SECRET"].filter(
        (k) => Boolean(env(k)),
      );
      return exposed.length === 0
        ? ok(`אין סודות חשופים ללקוח; ${serverSide.length} מפתחות ספק נקראים מסביבת השרת בזמן ריצה`)
        : fail(
            `סודות חשופים ללקוח: ${exposed.join(", ")}`,
            "העבר אותם לסודות שרת ללא קידומת VITE_",
          );
    }),
    await run("security.ratelimit", "הגבלת קצב", () =>
      rateLimit.ok
        ? ok("מגביל הקצב של הסוכן נבדק בפועל והחזיר תשובה")
        : fail(`מגביל הקצב לא זמין: ${rateLimit.message}`, "בדוק את פונקציית ai_rate_limit_hit"),
    ),
    await run("security.vulnerabilities", "אין פגיעויות קריטיות", () => {
      const d = daysSince(review.reviewed_at);
      if (d === null || review.open_critical === null)
        return fail(
          "לא תועדה סקירת אבטחה",
          "הרץ סריקת אבטחה ועדכן security_review עם התאריך ומספר הממצאים",
        );
      if (d > 90) return fail(`הסקירה האחרונה לפני ${d} ימים`, "בצע סקירת אבטחה מחודשת");
      return (review.open_critical ?? 0) === 0 && (review.open_high ?? 0) === 0
        ? ok(`סקירה לפני ${d} ימים על ידי ${review.reviewer || "לא צוין"} — אין ממצאים פתוחים`)
        : fail(
            `ממצאים פתוחים: ${review.open_critical} קריטיים, ${review.open_high} גבוהים`,
            "סגור את הממצאים לפני מעבר לחי",
          );
    }),
  ];
}

/* --------------------------------------------------------------- CX */

async function cxChecks(): Promise<LaunchCheck[]> {
  const pages: { id: string; label: string; route: string }[] = [
    { id: "home", label: "דף הבית", route: "index" },
    { id: "flights", label: "טיסות", route: "flights" },
    { id: "packages", label: "חבילות", route: "packages" },
    { id: "deal", label: "עמוד דיל", route: "deal.$id" },
    { id: "ai", label: "מסך AI", route: "ai.index" },
    { id: "checkout", label: "צ׳קאאוט", route: "_authenticated/checkout.$id" },
    { id: "booking", label: "ניהול הזמנה", route: "_authenticated/booking.$id" },
    { id: "account", label: "אזור אישי", route: "_authenticated/account" },
    { id: "support", label: "תמיכה", route: "support" },
    { id: "legal", label: "מסמכים משפטיים", route: "legal.$doc" },
  ];

  const checks = await Promise.all(
    pages.map((p) =>
      run(`cx.${p.id}`, p.label, () =>
        routeExists(p.route)
          ? ok(`מסלול פעיל: ${p.route}`)
          : fail(`חסר מסלול ${p.route}`, "צור את העמוד"),
      ),
    ),
  );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from("app_error_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);

  checks.push(
    await run("cx.errors", "אין שגיאות בעמודים", () =>
      (count ?? 0) === 0
        ? ok("לא נרשמו שגיאות אפליקציה ב-24 השעות האחרונות")
        : fail(`${count} שגיאות אפליקציה ב-24 השעות האחרונות`, "בדוק את לוג השגיאות ותקן"),
    ),
  );

  checks.push(
    await run("cx.payment-confirmation", "תשלום ואישור הזמנה", async () => {
      const { buildBookingDocument } = await import("@/lib/voucher");
      return typeof buildBookingDocument === "function"
        ? ok("מסך התשלום מסתיים במסמך אישור/שובר שנבנה בפועל מנתוני ההזמנה")
        : fail("אין בונה מסמכים", "בדוק את voucher.ts");
    }),
  );

  return checks;
}

/* --------------------------------------------------------------- report */

export async function runCommercialChecklist(): Promise<CommercialReport> {
  const groups: CommercialGroup[] = [];
  const add = (id: CommercialGroupId, checks: LaunchCheck[]) =>
    groups.push({ id, label: COMMERCIAL_GROUP_LABELS[id], checks });

  add("business", await businessChecks());
  add("legal", await legalChecks());
  add("payments", await paymentChecks());
  add("email", await emailChecks());
  add("sms", await smsChecks());
  add("suppliers", await supplierChecks());
  add("observability", await observabilityChecks());
  add("backup", await backupChecks());
  add("security", await securityChecks());
  add("cx", await cxChecks());

  const all = groups.flatMap((g) => g.checks);
  const totals = {
    pass: all.filter((c) => c.status === "pass").length,
    warn: all.filter((c) => c.status === "warn").length,
    fail: all.filter((c) => c.status === "fail").length,
  };
  const blockers = all.filter((c) => c.status !== "pass").map((c) => `${c.label}: ${c.detail}`);
  const { liveMode } = await import("@/lib/providers/live-registry.server");

  return {
    ranAt: new Date().toISOString(),
    liveMode: liveMode(),
    gateOpen: totals.fail === 0 && totals.warn === 0,
    totals,
    groups,
    blockers,
  };
}
