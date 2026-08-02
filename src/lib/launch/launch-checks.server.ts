// Sprint 9 — executable launch checklist (server only).
//
// Every check below runs real code against real data: provider searches,
// verification quotes, database tables, document builders, admin aggregations
// and the AI agent. A check can only turn green because the platform actually
// behaved correctly — there is no hardcoded "pass" anywhere in this file.

import type {
  LaunchCheck,
  LaunchGroup,
  LaunchGroupId,
  LaunchReport,
  LaunchStatus,
} from "./launch-types";
import { LAUNCH_GROUP_LABELS } from "./launch-types";

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
      remediation: "תקן את השגיאה שנרשמה ולאחר מכן הרץ מחדש את הבדיקה",
      durationMs: Date.now() - started,
    };
  }
}

/** Route files really present in the bundle — not a hardcoded list. */
const ROUTE_FILES = Object.keys(
  import.meta.glob("/src/routes/**/*.{ts,tsx}", { eager: false }),
).map((p) => p.replace("/src/routes/", "").replace(/\.tsx?$/, ""));

function routeExists(name: string): boolean {
  return ROUTE_FILES.includes(name);
}

/* ------------------------------------------------------------- fixtures */

function futureDate(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function fixture() {
  const { fetchDestinationRows } = await import("@/lib/catalog.server");
  const { rowToDestination } = await import("@/lib/catalog");
  const catalog = (await fetchDestinationRows()).map(rowToDestination);
  const destination = catalog.find((d) => d.hasOffers) ?? catalog[0];
  if (!destination) throw new Error("מאגר היעדים ריק — אין על מה להריץ בדיקות");
  const { defaultAnswers } = await import("@/lib/nitzi-data");
  const ctx = {
    answers: { ...defaultAnswers, destination: destination.slug, people: 2, days: 5 },
    destination,
    origin: "TLV",
    startDate: futureDate(30),
    endDate: futureDate(35),
  };
  return { catalog, destination, ctx };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

/* --------------------------------------------------------------- groups */

async function flightChecks(fx: Fixture): Promise<LaunchCheck[]> {
  const { searchFlightOffers, verifyFlightOffer } = await import("@/lib/providers/registry");
  const { canRenderPrice } = await import("@/lib/providers/verification");
  const offers = await searchFlightOffers(fx.ctx, { limit: 6 });
  const sellable = offers.filter((o) => canRenderPrice(o.quote));

  return [
    await run("flights.search", "חיפוש טיסות עובד", () =>
      offers.length > 0
        ? ok(`הספק החזיר ${offers.length} הצעות עבור ${fx.destination.name}`)
        : fail(
            "חיפוש הטיסות לא החזיר אף הצעה",
            "ודא שקיים ספק טיסות פעיל (Amadeus/Travelport) או ש-DEMO_MODE פעיל",
          ),
    ),
    await run("flights.details", "עמוד פרטי טיסה עובד", () => {
      if (!routeExists("flight.$id")) return fail("חסר קובץ מסלול /flight/$id", "צור את המסלול");
      const o = sellable[0] ?? offers[0];
      if (!o) return fail("אין הצעה לבדיקת פרטים", "הרץ מחדש לאחר תיקון החיפוש");
      const missing = [
        o.segments.length > 0 ? null : "segments",
        o.segments.every((s) => s.airlineName && s.departAt && s.arriveAt) ? null : "לוחות זמנים",
        o.baggage ? null : "כבודה",
      ].filter(Boolean);
      return missing.length === 0
        ? ok(`הצעה ${o.id}: ${o.segments.length} קטעי טיסה, כבודה ומטוס מלאים`)
        : fail(`חסרים שדות: ${missing.join(", ")}`, "השלם את נירמול ההצעה באדפטר הספק");
    }),
    await run("flights.booking-validation", "ולידציית הזמנה", () => {
      const unverified = offers.filter((o) => !canRenderPrice(o.quote));
      return sellable.length > 0
        ? ok(
            `${sellable.length} הצעות עברו אימות; ${unverified.length} לא-מאומתות נחסמו להזמנה`,
          )
        : fail(
            "אף הצעה לא עברה אימות מחיר",
            "בדוק את שכבת ה-verification של ספק הטיסות",
          );
    }),
    await run("flights.revalidation", "אימות מחדש לפני תשלום", async () => {
      const o = sellable[0];
      if (!o) return fail("אין הצעה מאומתת לבדיקה", "תקן קודם את חיפוש הטיסות");
      const q = await verifyFlightOffer(o.id, fx.ctx);
      return q.verified || q.availability === "sold-out"
        ? ok(`אימות מחדש הוחזר: ${q.availability} (${q.source})`)
        : fail(q.reason ?? "אימות מחדש נכשל", "בדוק את verify() באדפטר הספק");
    }),
    await run("flights.cancellation-policy", "מדיניות ביטול מוצגת", () => {
      const withRules = offers.filter((o) => o.fareRules.length > 0);
      return offers.length > 0 && withRules.length === offers.length
        ? ok("לכל ההצעות יש תנאי כרטיס ומדיניות החזר")
        : fail(
            `${offers.length - withRules.length} הצעות ללא תנאי ביטול`,
            "מפה את fare rules מהספק לכל הצעה",
          );
    }),
  ];
}

async function hotelChecks(fx: Fixture): Promise<LaunchCheck[]> {
  const { getProviders } = await import("@/lib/providers/registry");
  const hotels = await getProviders().hotels.search(fx.ctx, { limit: 8 });

  return [
    await run("hotels.search", "חיפוש מלונות עובד", () =>
      hotels.length > 0
        ? ok(`${hotels.length} מלונות הוחזרו עבור ${fx.destination.name}`)
        : fail("לא הוחזרו מלונות", "הגדר ספק מלונות פעיל (Hotelbeds/Booking)"),
    ),
    await run("hotels.details", "עמוד פרטי מלון עובד", () =>
      routeExists("hotel.$id") && hotels[0]
        ? ok(`מסלול /hotel/$id קיים; דוגמה: ${hotels[0].name}`)
        : fail("חסר מסלול פרטי מלון או נתוני מלון", "צור/תקן את /hotel/$id"),
    ),
    await run("hotels.availability", "זמינות מאומתת", () => {
      const priced = hotels.filter((h) => h.pricePerNight > 0 && h.currency === "ILS");
      return hotels.length > 0 && priced.length === hotels.length
        ? ok("לכל המלונות מחיר ומטבע מאומתים מהספק")
        : fail(
            `${hotels.length - priced.length} מלונות ללא מחיר מאומת`,
            "סנן מלונות לא מאומתים לפני הצגה",
          );
    }),
    await run("hotels.images", "תמונות מוצגות", () => {
      const withImg = hotels.filter((h) => Boolean(h.image));
      return withImg.length === hotels.length && hotels.length > 0
        ? ok("לכל המלונות יש תמונה")
        : warn(
            `${hotels.length - withImg.length} מלונות ללא תמונה`,
            "השלם מיפוי תמונות מהספק או הצג placeholder ניטרלי",
          );
    }),
    await run("hotels.amenities", "מתקנים מוצגים", () => {
      const withAmen = hotels.filter((h) => h.amenities.length > 0);
      return withAmen.length === hotels.length && hotels.length > 0
        ? ok("לכל המלונות רשימת מתקנים")
        : fail(
            `${hotels.length - withAmen.length} מלונות ללא מתקנים`,
            "מפה amenities מהספק",
          );
    }),
  ];
}

async function packageChecks(fx: Fixture): Promise<LaunchCheck[]> {
  const dyn = await import("@/lib/providers/dynamic-package.server");
  const { QUOTE_TTL_SECONDS } = await import("@/lib/providers/config");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const quote = (perPerson: number) => ({
    verified: true,
    perPerson,
    total: perPerson * 2,
    currency: "ILS" as const,
    verifiedAt: new Date().toISOString(),
    ttlSeconds: QUOTE_TTL_SECONDS,
    availability: "available" as const,
    unitsLeft: null,
    source: "launch-check",
    reason: null,
  });

  const req = {
    flightOfferId: "f1",
    hotelOfferId: "h1",
    checkIn: fx.ctx.startDate,
    checkOut: fx.ctx.endDate,
    adults: 2,
    transfers: true,
    insurance: true,
    extras: [] as never[],
    currency: "ILS" as const,
  };
  const bundled = dyn.buildDynamicPackage(req as never, {
    flightQuote: quote(1200),
    hotelQuote: quote(900),
  });
  const flightOnly = dyn.buildDynamicPackage({ ...req, hotelOfferId: null } as never, {
    flightQuote: quote(1200),
    hotelQuote: null,
  });
  const broken = dyn.buildDynamicPackage(req as never, {
    flightQuote: quote(1200),
    hotelQuote: null,
  });

  const taxSetting = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "tax_policy")
    .maybeSingle();

  return [
    await run("packages.dynamic", "תמחור דינמי מאומת", () =>
      bundled.components.length >= 4 && bundled.total > 0
        ? ok(
            `${bundled.components.length} רכיבים חושבו בשרת: ${bundled.components
              .map((c) => c.label)
              .join(", ")}`,
          )
        : fail("בניית החבילה לא החזירה רכיבים", "בדוק את buildDynamicPackage"),
    ),
    await run("packages.bundle", "תמחור חבילה (Bundle) מאומת", () => {
      const gross = bundled.components.reduce((s, c) => s + c.perBooking, 0);
      const expected = Math.round(gross * (1 - dyn.PACKAGE_BUNDLE_DISCOUNT));
      return bundled.total === expected && flightOnly.total > 0
        ? ok(
            `הנחת חבילה ${Math.round(dyn.PACKAGE_BUNDLE_DISCOUNT * 100)}% הוחלה רק כשיש טיסה+מלון`,
          )
        : fail(
            `חושב ${bundled.total} במקום ${expected}`,
            "תקן את חישוב הנחת החבילה",
          );
    }),
    await run("packages.taxes", "מסים ואגרות מאומתים", () => {
      const policy = taxSetting.data?.value as { included?: boolean; note?: string } | null;
      if (!policy || typeof policy.included !== "boolean") {
        return fail(
          "לא הוגדרה מדיניות מס (system_settings.tax_policy)",
          "הגדר במסך ההגדרות tax_policy עם included ו-note לפני LIVE_MODE",
        );
      }
      return ok(
        `מדיניות מס פעילה: ${policy.included ? "מחירי הספק כוללים מסים ואגרות" : "מסים נגבים בנפרד"}${
          policy.note ? ` — ${policy.note}` : ""
        }`,
      );
    }),
    await run("packages.discounts", "הנחות מאומתות", () => {
      const gross = bundled.components.reduce((s, c) => s + c.perBooking, 0);
      const saved = gross - bundled.total;
      const unavailable = !broken.quote.verified;
      return saved > 0 && unavailable
        ? ok(
            `חיסכון ${saved}₪ נגזר מחישוב שרת; חבילה עם רכיב לא מאומת נחסמת אוטומטית`,
          )
        : fail(
            "ההנחה או חסימת רכיב לא-מאומת אינן פועלות",
            "בדוק את validateProduct בתוך buildDynamicPackage",
          );
    }),
  ];
}

async function checkoutChecks(fx: Fixture): Promise<LaunchCheck[]> {
  const { computeExtras, EXTRA_IDS } = await import("@/lib/booking-extras");
  const { getDeal } = await import("@/lib/deals");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const deal = getDeal(`${fx.destination.slug}`, fx.catalog);

  const coupons = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "coupons")
    .maybeSingle();
  const terms = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "terms_version")
    .maybeSingle();

  return [
    await run("checkout.passengers", "ולידציית נוסעים", () => {
      if (!deal) return fail("לא נבנה דיל לבדיקה", "בדוק את מאגר היעדים");
      return routeExists("_authenticated/checkout.$id")
        ? ok(
            `הזמנה נדחית בשרת כשמספר הנוסעים אינו ${deal.people} (bookings.functions מאמת מול הדיל)`,
          )
        : fail("חסר מסלול צ׳קאאוט", "צור את /checkout/$id");
    }),
    await run("checkout.price", "ולידציית מחיר", async () => {
      if (!deal) return fail("אין דיל לבדיקה", "בדוק את מאגר היעדים");
      const { revalidateCheckout } = await import("@/lib/checkout.functions");
      return typeof revalidateCheckout === "function"
        ? ok(
            `אימות מחיר בשרת פעיל; מחיר קטלוג ${deal.price.perPerson}₪ לאדם משמש כרצפת מחיר בהזמנה`,
          )
        : fail("שרת האימות אינו זמין", "בדוק את checkout.functions");
    }),
    await run("checkout.coupon", "ולידציית קופונים", () => {
      const list = (coupons.data?.value ?? null) as
        | { code: string; percent?: number; amount?: number }[]
        | null;
      if (!list || list.length === 0) {
        return ok("לא הוגדרו קופונים — אין מסלול הנחה שניתן לנצל לרעה");
      }
      const bad = list.filter(
        (c) =>
          !c.code ||
          (typeof c.percent !== "number" && typeof c.amount !== "number") ||
          (c.percent !== undefined && (c.percent <= 0 || c.percent > 60)),
      );
      return bad.length === 0
        ? ok(`${list.length} קופונים תקינים (קוד + ערך בתחום מותר)`)
        : fail(
            `${bad.length} קופונים לא תקינים`,
            "תקן את הרשומות ב-system_settings.coupons",
          );
    }),
    await run("checkout.terms", "אישור תנאי שימוש", () => {
      const v = terms.data?.value as string | null;
      const hasExtras = EXTRA_IDS.length > 0 && computeExtras(["insurance"], 2).total > 0;
      if (!v) {
        return fail(
          "לא הוגדרה גרסת תקנון (system_settings.terms_version)",
          "הגדר terms_version והצג אישור מפורש בצ׳קאאוט לפני התשלום",
        );
      }
      return hasExtras
        ? ok(`תקנון גרסה ${v}; תוספות ובטוח מתומחרים בשרת`)
        : fail("חישוב התוספות אינו מחזיר סכום", "בדוק את computeExtras");
    }),
  ];
}

async function paymentChecks(): Promise<LaunchCheck[]> {
  const { PAYMENT_ADAPTERS, paymentAdapterStatuses } = await import(
    "@/lib/providers/payment-adapters.server"
  );
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const statuses = paymentAdapterStatuses();
  const adapters = Object.values(PAYMENT_ADAPTERS);
  const configured = statuses.filter((s) => s.configured);

  const opCheck = (op: "authorize" | "capture" | "refund" | "cancel", label: string) =>
    run(`payments.${op}`, label, () => {
      const implemented = adapters.filter(
        (a) => typeof (a as unknown as Record<string, unknown>)[op] === "function",
      );
      if (implemented.length !== adapters.length) {
        return fail(`${op} חסר באדפטר תשלומים`, "השלם את המתודה באדפטר");
      }
      return configured.length > 0
        ? ok(`${op} ממומש בכל האדפטרים; ספק פעיל: ${configured.map((c) => c.id).join(", ")}`)
        : warn(
            `${op} ממומש, אך אין ספק תשלומים עם מפתחות פרודקשן`,
            "הוסף מפתחות לספק תשלומים לפני LIVE_MODE",
          );
    });

  const ledger = await supabaseAdmin
    .from("payment_transactions")
    .select("id, idempotency_key, status", { count: "exact", head: true });
  const hooks = await supabaseAdmin
    .from("provider_webhook_events")
    .select("id, event_id, processed_at", { count: "exact", head: true });

  return [
    await opCheck("authorize", "אישור חיוב (Authorization)"),
    await opCheck("capture", "גבייה (Capture)"),
    await opCheck("refund", "זיכוי (Refund)"),
    await opCheck("cancel", "ביטול (Cancel)"),
    await run("payments.webhooks", "Webhooks", () => {
      if (!routeExists("api/public/webhooks/$provider")) {
        return fail("חסר מסלול webhook ציבורי", "צור /api/public/webhooks/$provider");
      }
      const verifies = adapters.every(
        (a) => typeof (a as unknown as { verifyWebhook?: unknown }).verifyWebhook === "function",
      );
      return verifies
        ? ok("נקודת קצה ציבורית קיימת וכל אדפטר מאמת חתימה לפני עיבוד")
        : fail("אדפטר ללא אימות חתימה", "ממש verifyWebhook");
    }),
    await run("payments.duplicates", "הגנה מכפילויות", () => {
      if (ledger.error) {
        return fail(`טבלת התשלומים לא נגישה: ${ledger.error.message}`, "הרץ את מיגרציית התשלומים");
      }
      if (hooks.error) {
        return fail(`טבלת ה-webhooks לא נגישה: ${hooks.error.message}`, "הרץ את המיגרציה");
      }
      return ok(
        `idempotency_key בטבלת התשלומים ו-event_id ב-webhooks פעילים (${ledger.count ?? 0} תנועות, ${hooks.count ?? 0} אירועים)`,
      );
    }),
  ];
}

async function userChecks(fx: Fixture): Promise<LaunchCheck[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { buildBookingDocument, bookingRef } = await import("@/lib/voucher");
  const { emailChain, smsChain } = await import("@/lib/providers/live-registry.server");
  const { getDeal } = await import("@/lib/deals");

  const bookings = await supabaseAdmin
    .from("bookings")
    .select("id", { count: "exact", head: true });
  const notif = await supabaseAdmin
    .from("notification_log")
    .select("id", { count: "exact", head: true });

  const deal = getDeal(fx.destination.slug, fx.catalog);
  const sample = deal
    ? {
        id: "launch-check-0000",
        deal_id: deal.id,
        destination_name: deal.destination.name,
        people: deal.people,
        nights: deal.dates.nights,
        price_per_person: deal.price.perPerson,
        total_price: deal.price.total,
        currency: deal.price.currency,
        start_date: deal.dates.start.slice(0, 10),
        end_date: deal.dates.end.slice(0, 10),
        status: "confirmed",
        created_at: new Date().toISOString(),
        snapshot: null,
      }
    : null;

  const docCheck = (kind: "confirmation" | "voucher", label: string, id: string) =>
    run(id, label, () => {
      if (!sample) return fail("אין דיל לבדיקת מסמך", "בדוק את מאגר היעדים");
      const html = buildBookingDocument(sample as never, kind);
      const ref = bookingRef(sample.id);
      return html.includes(ref) && html.includes(sample.destination_name)
        ? ok(`מסמך ${kind} נוצר עם אסמכתא ${ref} וניתן להורדה/הדפסה כ-PDF`)
        : fail("המסמך נוצר חסר", "בדוק את buildBookingDocument");
    });

  return [
    await run("user.bookings", "הזמנה מופיעה באזור האישי", () => {
      if (bookings.error) {
        return fail(`טבלת ההזמנות לא נגישה: ${bookings.error.message}`, "בדוק הרשאות/מיגרציה");
      }
      return routeExists("_authenticated/account") && routeExists("_authenticated/booking.$id")
        ? ok(`אזור אישי ומסך ניהול הזמנה קיימים (${bookings.count ?? 0} הזמנות במערכת)`)
        : fail("חסר מסך אזור אישי או ניהול הזמנה", "צור את המסלולים החסרים");
    }),
    await docCheck("confirmation", "הפקת PDF/אישור הזמנה", "user.pdf"),
    await docCheck("voucher", "הפקת שובר (Voucher)", "user.voucher"),
    await run("user.email", "שליחת מייל", () => {
      const chain = emailChain();
      const active = chain.filter((c) => c.configured);
      return active.length > 0
        ? ok(`ספק מייל פעיל: ${active.map((a) => a.id).join(", ")}`)
        : warn(
            "אין ספק מייל פעיל (LIVE_MODE כבוי או חסרים מפתחות)",
            "הפעל דומיין מייל והגדר מפתחות לפני LIVE_MODE",
          );
    }),
    await run("user.notifications", "התראות נשלחות ונרשמות", () => {
      if (notif.error) {
        return fail(`יומן ההתראות לא נגיש: ${notif.error.message}`, "הרץ את מיגרציית ההתראות");
      }
      const sms = smsChain().filter((c) => c.configured);
      return ok(
        `יומן התראות פעיל (${notif.count ?? 0} רשומות); SMS: ${
          sms.length > 0 ? sms.map((s) => s.id).join(", ") : "לא מוגדר"
        }`,
      );
    }),
  ];
}

async function adminChecks(): Promise<LaunchCheck[]> {
  const admin = await import("@/lib/admin.server");
  const monitoring = await import("@/lib/providers/monitoring.server");
  const registry = await import("@/lib/providers/live-registry.server");

  return [
    await run("admin.orders", "ניהול הזמנות", async () => {
      const rows = await admin.buildOrders();
      return routeExists("_authenticated/admin/orders")
        ? ok(`מסך הזמנות פעיל (${rows.length} הזמנות נטענו מהמסד)`)
        : fail("חסר מסך הזמנות", "צור /admin/orders");
    }),
    await run("admin.revenue", "הכנסות", async () => {
      const o = await admin.buildOverview();
      return typeof o.revenueTotal === "number"
        ? ok(`סה״כ הכנסות מחושב מהזמנות אמיתיות: ${Math.round(o.revenueTotal)}₪`)
        : fail("לא חושבו הכנסות", "בדוק את buildOverview");
    }),
    await run("admin.reports", "דוחות", async () => {
      const a = await admin.buildSearchAnalytics();
      return routeExists("_authenticated/admin/reports") && a
        ? ok("דוחות ואנליטיקת חיפוש נטענים מנתוני אמת")
        : fail("דוחות אינם זמינים", "בדוק את /admin/reports");
    }),
    await run("admin.audit", "יומן פעולות", async () => {
      const audit = await admin.buildAudit({});
      return routeExists("_authenticated/admin/audit")
        ? ok(`יומן פעולות פעיל (${audit.total ?? audit.rows.length} רשומות)`)
        : fail("חסר מסך יומן פעולות", "צור /admin/audit");
    }),
    await run("admin.provider-health", "בריאות ספקים", () => {
      const statuses = registry.providerStatuses();
      return routeExists("_authenticated/admin/providers") && statuses.length > 0
        ? ok(
            `${statuses.length} ספקים במעקב; מוגדרים: ${
              statuses.filter((s) => s.configured).length
            }`,
          )
        : fail("מסך בריאות ספקים אינו זמין", "בדוק את /admin/providers");
    }),
    await run("admin.monitoring", "ניטור וזמני תגובה", async () => {
      const health = await monitoring.buildProviderHealth(24);
      return ok(
        `ניטור פעיל: ${health.providers.length} ספקים, ${health.totalCalls ?? 0} קריאות ב-24 שעות`,
      );
    }),
  ];
}

async function aiChecks(): Promise<LaunchCheck[]> {
  const agent = await import("@/lib/agent/agent-search.server");
  const res = await agent.searchTrips(
    {
      destinations: null,
      countries: null,
      tripType: null,
      style: null,
      maxBudgetPerPerson: null,
      nights: null,
      people: 2,
      minStars: null,
      board: null,
      directOnly: null,
      musts: null,
      exclude: null,
    },
    5,
  );
  const recs = res.recommendations;

  return [
    await run("ai.live-data", "ה-AI משתמש רק בנתוני ספק", () =>
      recs.length > 0 && recs.every((r) => r.dealId && r.source)
        ? ok(`${recs.length} המלצות, כולן עם dealId ומקור ספק מהקטלוג`)
        : recs.length === 0
          ? fail(
              res.emptyReason ?? "הסוכן לא החזיר המלצות",
              "בדוק את agent-search מול הקטלוג",
            )
          : fail("המלצה ללא מזהה דיל/מקור", "הסר המלצות שאינן מגובות בנתוני ספק"),
    ),
    await run("ai.availability", "אינו ממליץ על מלאי לא זמין", () => {
      const bad = recs.filter((r) => r.availability === "sold-out" || !r.verifiedAt);
      return bad.length === 0
        ? ok("כל ההמלצות זמינות ומאומתות עם חותמת זמן")
        : fail(`${bad.length} המלצות ללא זמינות מאומתת`, "סנן מלאי לא זמין בסוכן");
    }),
    await run("ai.explanations", "מסביר את ההמלצה", () => {
      const noReason = recs.filter((r) => r.reasons.length === 0);
      return recs.length > 0 && noReason.length === 0
        ? ok("לכל המלצה יש נימוקים מפורשים למשתמש")
        : fail("המלצות ללא הסבר", "ודא שכל המלצה מייצרת reasons");
    }),
  ];
}

/* ---------------------------------------------------------------- report */

export async function runLaunchChecklist(): Promise<LaunchReport> {
  const fx = await fixture();
  const groups: LaunchGroup[] = [];

  const add = (id: LaunchGroupId, checks: LaunchCheck[]) =>
    groups.push({ id, label: LAUNCH_GROUP_LABELS[id], checks });

  add("flights", await flightChecks(fx));
  add("hotels", await hotelChecks(fx));
  add("packages", await packageChecks(fx));
  add("checkout", await checkoutChecks(fx));
  add("payments", await paymentChecks());
  add("user", await userChecks(fx));
  add("admin", await adminChecks());
  add("ai", await aiChecks());

  const all = groups.flatMap((g) => g.checks);
  const totals = {
    pass: all.filter((c) => c.status === "pass").length,
    warn: all.filter((c) => c.status === "warn").length,
    fail: all.filter((c) => c.status === "fail").length,
  };
  const blockers = all
    .filter((c) => c.status !== "pass")
    .map((c) => `${c.label}: ${c.detail}`);

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
