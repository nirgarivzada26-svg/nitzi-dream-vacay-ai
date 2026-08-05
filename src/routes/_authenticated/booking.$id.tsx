// Manage booking — the post-purchase hub for a single order.
//
// Reads are RLS-scoped to the owner; every state change (cancel, refund) goes
// through server functions because `bookings` is not client-writable.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Hotel,
  LifeBuoy,
  Mail,
  Plane,
  Receipt,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cancelBooking, requestRefund } from "@/lib/booking-lifecycle.functions";
import { downloadBookingDocument, bookingRef, type DocumentBooking } from "@/lib/voucher";
import { createSupportRequest } from "@/lib/support";
import type { BookingRow } from "@/lib/user-data";

export const Route = createFileRoute("/_authenticated/booking/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `ניהול הזמנה ${params.id.slice(0, 8).toUpperCase()} — NITZI` },
      {
        name: "description",
        content: "צפייה בהזמנה, הורדת שובר וחשבונית, ביטול, בקשת החזר ופנייה לתמיכה.",
      },
      { property: "og:title", content: "ניהול הזמנה — NITZI" },
      { property: "og:description", content: "כל הפעולות על ההזמנה שלך במקום אחד." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ManageBookingPage,
});

const fmtILS = (n: number) => `₪${Math.round(Number(n)).toLocaleString("he-IL")}`;
const fmtDate = (v: string) => new Date(v).toLocaleDateString("he-IL");

interface ManagedBooking extends BookingRow {
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_status: string | null;
}

async function fetchBooking(id: string): Promise<ManagedBooking | null> {
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as ManagedBooking | null;
}

const REFUND_LABEL: Record<string, string> = {
  eligible: "זכאי להחזר מלא",
  review: "בבדיקת מדיניות הספק",
  requested: "בקשת החזר התקבלה",
  processing: "ההחזר בטיפול",
};

function Row({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-muted/50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <div className="text-[11px] font-black text-muted-foreground">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

function ManageBookingPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const doCancel = useServerFn(cancelBooking);
  const doRefund = useServerFn(requestRefund);

  const q = useQuery({ queryKey: ["booking", id], queryFn: () => fetchBooking(id) });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");

  const b = q.data ?? null;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["booking", id] });
    await qc.invalidateQueries({ queryKey: ["bookings"] });
  };

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      await fn();
      await refresh();
      setNote(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  if (q.isLoading) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!b) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">ההזמנה לא נמצאה</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            ייתכן שההזמנה שייכת לחשבון אחר.
          </p>
          <Link
            to="/account"
            search={{ tab: "bookings" }}
            className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white"
          >
            להזמנות שלי
          </Link>
        </div>
      </div>
    );
  }

  const snap = b.snapshot as unknown as {
    hotel?: { name?: string };
    outbound?: { airline?: string; flightNumber?: string; departAt?: string };
    inbound?: { airline?: string; flightNumber?: string; departAt?: string };
    booking?: {
      contact?: { email?: string };
      extras?: { label: string; amount: number }[];
      payment?: { method?: string };
    };
  } | null;

  const cancelled = b.status === "cancelled";
  const doc = b as unknown as DocumentBooking;
  const contactEmail = snap?.booking?.contact?.email ?? "";
  const extras = snap?.booking?.extras ?? [];
  const upcoming = new Date(b.start_date).getTime() > Date.now();

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-sand/50 via-background to-background"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 sm:px-10">
        <Link
          to="/account"
          search={{ tab: "bookings" }}
          className="inline-flex items-center gap-1.5 text-sm font-black text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" /> להזמנות שלי
        </Link>

        <header className="mt-4 rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-black ${
                  cancelled ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {cancelled ? "הזמנה מבוטלת" : upcoming ? "חופשה קרובה" : "הזמנה שהסתיימה"}
              </span>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{b.destination_name}</h1>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                מספר הזמנה #{bookingRef(b.id)} · נוצרה ב-{fmtDate(b.created_at)}
              </p>
            </div>
            <div className="text-left">
              <div className="text-[11px] font-black text-muted-foreground">סה״כ שולם</div>
              <div className="text-3xl font-black">{fmtILS(b.total_price)}</div>
              {b.refund_status && (
                <div className="mt-1 text-[11px] font-black text-primary">
                  החזר: {REFUND_LABEL[b.refund_status] ?? b.refund_status}
                </div>
              )}
            </div>
          </div>
        </header>

        {(note || error) && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${
              error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {error ?? note}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-black">פרטי הנסיעה</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Row
                  icon={Calendar}
                  label="תאריכים"
                  value={`${fmtDate(b.start_date)} – ${fmtDate(b.end_date)} · ${b.nights} לילות`}
                />
                <Row icon={Users} label="נוסעים" value={`${b.people} נוסעים`} />
                <Row icon={Hotel} label="מלון" value={snap?.hotel?.name ?? "לא זמין"} />
                <Row
                  icon={Plane}
                  label="טיסה"
                  value={
                    snap?.outbound?.airline
                      ? `${snap.outbound.airline} ${snap.outbound.flightNumber ?? ""}`
                      : "לא זמין"
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Receipt className="h-4 w-4 text-primary" /> פירוט תשלום
              </h2>
              <ul className="mt-3 grid gap-1.5 text-sm font-bold">
                <li className="flex justify-between">
                  <span>
                    חבילה · {b.people} × {fmtILS(b.price_per_person)}
                  </span>
                  <span>{fmtILS(b.price_per_person * b.people)}</span>
                </li>
                {extras.map((e) => (
                  <li key={e.label} className="flex justify-between text-muted-foreground">
                    <span>{e.label}</span>
                    <span>{fmtILS(e.amount)}</span>
                  </li>
                ))}
                <li className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-black">
                  <span>סה״כ</span>
                  <span>{fmtILS(b.total_price)}</span>
                </li>
              </ul>
              {snap?.booking?.payment?.method && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> שולם באמצעות{" "}
                  {snap.booking.payment.method === "card"
                    ? "כרטיס אשראי"
                    : snap.booking.payment.method}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-black">מסמכי הנסיעה</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["confirmation", "אישור הזמנה", FileText],
                    ["voucher", "שובר נסיעה", BadgeCheck],
                    ["invoice", "חשבונית", Receipt],
                  ] as const
                ).map(([kind, label, Icon]) => (
                  <button
                    key={kind}
                    onClick={() => downloadBookingDocument(doc, kind)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:border-primary/50"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> כל מסמך נפתח כדף מוכן להדפסה — שמירה כ-PDF דרך
                Ctrl/Cmd + P.
              </p>
            </section>
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-8 lg:self-start">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-black">פעולות</h2>
              <div className="mt-3 grid gap-2">
                <Link
                  to="/deal/$id"
                  params={{ id: b.deal_id }}
                  search={{ flight: undefined }}
                  className="rounded-2xl border border-border px-4 py-3 text-center text-sm font-black hover:border-primary/50"
                >
                  צפייה בדיל, במלון ובטיסה
                </Link>

                <button
                  disabled={!contactEmail || busy !== null}
                  onClick={() =>
                    run(
                      "email",
                      () =>
                        createSupportRequest({
                          topic: "booking",
                          email: contactEmail,
                          message: `בקשה לשליחה חוזרת של מסמכי ההזמנה ${bookingRef(b.id)} לכתובת ${contactEmail}.`,
                          bookingId: b.id,
                        }),
                      "הבקשה נרשמה — הצוות ישלח את המסמכים לאימייל שבהזמנה.",
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:border-primary/50 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" /> שליחת המסמכים לאימייל
                </button>

                {!cancelled && (
                  <button
                    disabled={busy !== null}
                    onClick={() => setConfirmCancel(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> ביטול הזמנה
                  </button>
                )}

                {cancelled && b.refund_status !== "requested" && (
                  <button
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        "refund",
                        () => doRefund({ data: { bookingId: b.id, reason } }),
                        "בקשת ההחזר נשלחה ונמצאת בטיפול.",
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-4 py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" /> בקשת החזר כספי
                  </button>
                )}

                <button
                  onClick={() => navigate({ to: "/support" })}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:border-primary/50"
                >
                  <LifeBuoy className="h-4 w-4" /> פנייה לתמיכה
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-black">ציר הזמן</h2>
              <ol className="mt-3 grid gap-2 text-sm font-bold">
                <li className="flex justify-between">
                  <span>ההזמנה נוצרה</span>
                  <span className="text-muted-foreground">{fmtDate(b.created_at)}</span>
                </li>
                {b.cancelled_at && (
                  <li className="flex justify-between text-red-700">
                    <span>ההזמנה בוטלה</span>
                    <span>{fmtDate(b.cancelled_at)}</span>
                  </li>
                )}
                <li className="flex justify-between">
                  <span>יציאה</span>
                  <span className="text-muted-foreground">{fmtDate(b.start_date)}</span>
                </li>
                <li className="flex justify-between">
                  <span>חזרה</span>
                  <span className="text-muted-foreground">{fmtDate(b.end_date)}</span>
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-glow">
            <h3 className="text-xl font-black">לבטל את ההזמנה?</h3>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              הביטול נרשם מיידית. אם הדיל כלל ביטול חינם — תסומן זכאות להחזר מלא, אחרת הבקשה תעבור
              לבדיקת מדיניות הספק.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="סיבת הביטול (אופציונלי)"
              className="mt-3 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-black"
              >
                חזרה
              </button>
              <button
                disabled={busy === "cancel"}
                onClick={async () => {
                  await run(
                    "cancel",
                    () => doCancel({ data: { bookingId: b.id, reason } }),
                    "ההזמנה בוטלה.",
                  );
                  setConfirmCancel(false);
                }}
                className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {busy === "cancel" ? "מבטל…" : "כן, בטל"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
