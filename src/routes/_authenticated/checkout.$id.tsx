// Checkout — protected, 5 steps:
// 1) פרטי נוסעים  2) שירותים נוספים  3) סיכום  4) תשלום  5) אישור
// A final Price Revalidation runs before charging; any change is shown for
// explicit approval. No real charge is made in the MVP.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Mail,
  RefreshCw,
  ShieldCheck,
  Timer,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { getDeal, type Deal } from "@/lib/deals";
import { revalidateCheckout, type CheckoutRevalidation } from "@/lib/checkout.functions";
import { placeBooking } from "@/lib/bookings.functions";
import { EXTRAS, computeExtras, type ExtraId } from "@/lib/booking-extras";
import { NitziLogo } from "@/components/NitziLogo";
import { SmartPriceBadge } from "@/components/SmartPriceBadge";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";

export const Route = createFileRoute("/_authenticated/checkout/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `אישור הזמנה — NITZI` },
      {
        name: "description",
        content: `סיום ההזמנה ל${decodeURIComponent(params.id)} עם בדיקת מחיר לפני חיוב.`,
      },
      { property: "og:title", content: "אישור הזמנה — NITZI" },
      { property: "og:description", content: "בדיקת מחיר וזמינות לפני החיוב." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: CheckoutPage,
});

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString()}`;

interface Passenger {
  firstName: string;
  lastName: string;
  birthDate: string;
  passport: string;
  passportExpiry: string;
}
const emptyPassenger = (): Passenger => ({
  firstName: "",
  lastName: "",
  birthDate: "",
  passport: "",
  passportExpiry: "",
});

const STEPS = ["פרטי נוסעים", "שירותים נוספים", "סיכום", "תשלום", "אישור"];

function CheckoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const catalog = useDestinations();

  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id, catalog));
  const [reval, setReval] = useState<CheckoutRevalidation | null>(null);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ id: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const submitBooking = useServerFn(placeBooking);
  const idemKey = useRef<string | null>(null);

  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    Array.from({ length: deal?.people ?? 2 }, emptyPassenger),
  );
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [extras, setExtras] = useState<Record<ExtraId, boolean>>({
    bag: true,
    trolley: false,
    seat: false,
    insurance: true,
    transfers: true,
    meals: false,
  });
  const [payMethod, setPayMethod] = useState<"card" | "apple" | "google">("card");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!deal) return;
      try {
        const res = await revalidateCheckout({ data: { dealId: deal.id } });
        if (!alive) return;
        setReval(res);
        if (res.perPerson !== null && res.total !== null) {
          setDeal((d) =>
            d
              ? {
                  ...d,
                  price: {
                    ...d.price,
                    perPerson: res.perPerson!,
                    total: res.total!,
                    verifiedAt: res.verifiedAt ?? d.price.verifiedAt,
                  },
                }
              : d,
          );
        }
      } catch {
        if (alive) setReval(null);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const people = deal?.people ?? 2;
  const selectedExtras = useMemo(
    () => (Object.keys(extras) as ExtraId[]).filter((k) => extras[k]),
    [extras],
  );
  const extrasLines = useMemo(
    () => computeExtras(selectedExtras, people).lines,
    [selectedExtras, people],
  );
  const extrasTotal = extrasLines.reduce((s, l) => s + l.amount, 0);
  const grandTotal = (deal?.price.total ?? 0) + extrasTotal;

  if (!deal) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">הדיל לא נמצא</h1>
          <Link
            to="/"
            className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow"
          >
            חזרה לבית
          </Link>
        </div>
      </div>
    );
  }

  const changed = reval?.status === "changed";
  const soldOut =
    reval?.status === "sold-out" ||
    reval?.status === "unavailable" ||
    deal.price.availability === "sold-out";

  const passengersValid =
    passengers.every(
      (p) => p.firstName && p.lastName && p.birthDate && p.passport && p.passportExpiry,
    ) &&
    /\S+@\S+\.\S+/.test(contact.email) &&
    contact.phone.length >= 9;
  // No card details are collected in this app — charging (when a live
  // payment provider is configured) happens through the provider directly.
  // Method selection alone is always a valid choice.
  const paymentValid = true;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    // Stable key so a double-click / retry can never create two bookings.
    if (!idemKey.current) idemKey.current = crypto.randomUUID();
    try {
      const row = await submitBooking({
        data: {
          dealId: deal.id,
          idempotencyKey: idemKey.current,
          passengers,
          extras: selectedExtras,
          contact,
          paymentMethod: payMethod,
          confirmedPerPerson: deal.price.perPerson,
        },
      });
      setPlaced({ id: row.id });
      setStep(4);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בהזמנה");
    } finally {
      setBusy(false);
    }
  };

  const downloadConfirmation = () => {
    if (!placed) return;
    const html = `<!doctype html><html dir="rtl" lang="he"><meta charset="utf-8">
<title>אישור הזמנה NITZI ${placed.id.slice(0, 8).toUpperCase()}</title>
<body style="font-family:system-ui;padding:40px;max-width:700px">
<h1>NITZI — אישור הזמנה</h1>
<p>מספר הזמנה: <b>${placed.id.slice(0, 8).toUpperCase()}</b></p>
<p>יעד: <b>${deal.destination.name}, ${deal.destination.country}</b></p>
<p>תאריכים: ${new Date(deal.dates.start).toLocaleDateString("he-IL")} – ${new Date(deal.dates.end).toLocaleDateString("he-IL")} (${deal.dates.nights} לילות)</p>
<p>מלון: ${deal.hotel.name}</p>
<p>טיסה: ${deal.outbound.airline} ${deal.outbound.flightNumber}</p>
<p>נוסעים: ${passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}</p>
<p>שירותים נוספים: ${extrasLines.map((l) => `${l.label} (${fmtILS(l.amount)})`).join(", ") || "—"}</p>
<h2>סה״כ: ${fmtILS(grandTotal)}</h2>
<p style="color:#666;font-size:12px">מסמך זה מופק על ידי NITZI. להדפסה כ-PDF: Ctrl/Cmd + P → שמור כ-PDF.</p>
</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `nitzi-booking-${placed.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-sand/60 via-background to-background pb-20"
    >
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-6 sm:px-10">
        <button
          onClick={() =>
            step > 0 && !placed
              ? setStep(step - 1)
              : navigate({ to: "/deal/$id", params: { id }, search: { flight: undefined } })
          }
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <NitziLogo />
        <div className="w-11" />
      </header>

      <div className="mx-auto mt-8 w-full max-w-[1600px] px-5 sm:px-10">
        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-black sm:text-sm ${
                  i === step
                    ? "bg-gradient-sunset text-white shadow-glow"
                    : i < step
                      ? "bg-emerald-100 text-emerald-800"
                      : "border border-border bg-card text-muted-foreground"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[11px]">
                  {i + 1}
                </span>
                {s}
              </span>
              {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" />}
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
            {step === 0 && (
              <section>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">פרטי נוסעים</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  כפי שמופיע בדרכון — כדי שלא תהיה בעיה בצ׳ק-אין.
                </p>
                <div className="mt-6 space-y-6">
                  {passengers.map((p, i) => (
                    <div key={i} className="rounded-3xl border border-border bg-muted/30 p-5">
                      <div className="flex items-center gap-2 text-sm font-black text-foreground">
                        <User className="h-4 w-4 text-primary" /> נוסע {i + 1}
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field
                          label="שם פרטי"
                          value={p.firstName}
                          onChange={(v) => updatePassenger(setPassengers, i, { firstName: v })}
                        />
                        <Field
                          label="שם משפחה"
                          value={p.lastName}
                          onChange={(v) => updatePassenger(setPassengers, i, { lastName: v })}
                        />
                        <Field
                          label="תאריך לידה"
                          type="date"
                          value={p.birthDate}
                          onChange={(v) => updatePassenger(setPassengers, i, { birthDate: v })}
                        />
                        <Field
                          label="מספר דרכון"
                          value={p.passport}
                          onChange={(v) => updatePassenger(setPassengers, i, { passport: v })}
                        />
                        <Field
                          label="תוקף דרכון"
                          type="date"
                          value={p.passportExpiry}
                          onChange={(v) => updatePassenger(setPassengers, i, { passportExpiry: v })}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="אימייל ליצירת קשר"
                      type="email"
                      value={contact.email}
                      onChange={(v) => setContact((c) => ({ ...c, email: v }))}
                    />
                    <Field
                      label="טלפון"
                      type="tel"
                      value={contact.phone}
                      onChange={(v) => setContact((c) => ({ ...c, phone: v }))}
                    />
                  </div>
                </div>
              </section>
            )}

            {step === 1 && (
              <section>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">שירותים נוספים</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  בחר מה להוסיף לחבילה. אפשר לשנות גם אחרי ההזמנה.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {EXTRAS.map((e) => {
                    const on = extras[e.id];
                    const amount = e.perPerson ? e.price * people : e.price;
                    return (
                      <button
                        key={e.id}
                        onClick={() => setExtras((x) => ({ ...x, [e.id]: !x[e.id] }))}
                        className={`flex items-center justify-between rounded-3xl border p-4 text-right transition ${
                          on
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-black text-foreground">{e.label}</div>
                          <div className="text-[12px] text-muted-foreground">{e.note}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-base font-black text-foreground">
                            {amount === 0 ? "כלול" : `+${fmtILS(amount)}`}
                          </div>
                          <div
                            className={`text-[11px] font-bold ${on ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {on ? "נבחר" : "הוסף"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">סיכום ההזמנה</h1>
                <div className="mt-6 space-y-2 rounded-3xl border border-border bg-muted/30 p-5 text-sm">
                  <Row
                    label="חבילה"
                    value={`${deal.destination.name} · ${deal.dates.nights} לילות · ${people} נוסעים`}
                  />
                  <Row label="מלון" value={deal.hotel.name} />
                  <Row
                    label="טיסה"
                    value={`${deal.outbound.airline} ${deal.outbound.flightNumber}`}
                  />
                  <Row
                    label="נוסעים"
                    value={passengers.map((p) => `${p.firstName} ${p.lastName}`).join(" · ")}
                  />
                </div>
                <div className="mt-4 space-y-2 rounded-3xl border border-border p-5 text-sm">
                  <Row label="חבילה" value={fmtILS(deal.price.total)} />
                  {extrasLines.map((l) => (
                    <Row key={l.label} label={l.label} value={fmtILS(l.amount)} />
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-lg font-black">
                    <span>סה״כ</span>
                    <span className="text-gradient-sunset">{fmtILS(grandTotal)}</span>
                  </div>
                </div>
              </section>
            )}

            {step === 3 && (
              <section>
                <h1 className="text-2xl font-black text-foreground sm:text-3xl">תשלום</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  פרטי כרטיס אשראי אינם נאספים באתר. החיוב מתבצע ישירות מול ספק הסליקה בעת אישור
                  ההזמנה.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      { id: "card", label: "כרטיס אשראי" },
                      { id: "apple", label: "Apple Pay" },
                      { id: "google", label: "Google Pay" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={`rounded-3xl border p-4 text-sm font-black transition ${
                        payMethod === m.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border bg-card"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-[12px] font-bold text-rose-800">
                    {error}
                  </div>
                )}
              </section>
            )}

            {step === 4 && placed && (
              <section className="text-center">
                <div className="text-5xl">🎉</div>
                <h1 className="mt-3 text-3xl font-black text-foreground">ההזמנה אושרה</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  מספר הזמנה:{" "}
                  <span className="font-black text-foreground">
                    {placed.id.slice(0, 8).toUpperCase()}
                  </span>
                </p>
                <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-3">
                  <button
                    onClick={downloadConfirmation}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow"
                  >
                    <Download className="h-4 w-4" /> קבל אישור (PDF)
                  </button>
                  <button
                    onClick={() => setEmailSent(true)}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-black text-foreground"
                  >
                    <Mail className="h-4 w-4" /> שלח למייל
                  </button>
                  <Link
                    to="/account"
                    className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-black text-foreground"
                  >
                    אזור אישי
                  </Link>
                  <Link
                    to="/"
                    className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-bold text-muted-foreground"
                  >
                    אחר כך
                  </Link>
                </div>
                {emailSent && (
                  <p className="mt-4 text-[12px] font-bold text-amber-900">
                    שליחת מייל תופעל בגל הבא (חיבור ספק דיוור). בינתיים אפשר להוריד את האישור.
                  </p>
                )}
              </section>
            )}
          </main>

          {/* Sticky summary */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-black text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> בדיקת מחיר לפני חיוב
              </div>
              <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
                {checking ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" /> בודק מול{" "}
                    {deal.price.source}…
                  </div>
                ) : soldOut ? (
                  <div className="text-rose-800">
                    <div className="flex items-center gap-2 font-black">
                      <XCircle className="h-4 w-4" /> אזל המלאי
                    </div>
                    <p className="mt-1 text-[12px]">לא בוצע חיוב.</p>
                  </div>
                ) : changed ? (
                  <div className="text-amber-900">
                    <div className="flex items-center gap-2 font-black">
                      <Timer className="h-4 w-4" /> המחיר השתנה
                    </div>
                    <p className="mt-1 text-[12px]">
                      קודם:{" "}
                      <span className="line-through">{fmtILS(reval?.previousTotal ?? 0)}</span> ·
                      חדש: <span className="font-black">{fmtILS(deal.price.total)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="text-emerald-800">
                    <div className="flex items-center gap-2 font-black">
                      <BadgeCheck className="h-4 w-4" /> המחיר אומת
                    </div>
                    <p className="mt-1 text-[12px]">תשלם בדיוק את מה שראית.</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <SmartPriceBadge deal={deal} full />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <Row label="חבילה" value={fmtILS(deal.price.total)} />
                {extrasLines.map((l) => (
                  <Row key={l.label} label={l.label} value={fmtILS(l.amount)} />
                ))}
                <div className="flex items-center justify-between border-t border-border pt-2 text-lg font-black">
                  <span>סה״כ</span>
                  <span className="text-gradient-sunset">{fmtILS(grandTotal)}</span>
                </div>
              </div>

              {!placed && (
                <div className="mt-4 flex gap-2">
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="rounded-2xl border border-border px-4 py-3 text-sm font-bold text-foreground"
                    >
                      חזרה
                    </button>
                  )}
                  {step < 3 ? (
                    <button
                      onClick={() => setStep(step + 1)}
                      disabled={(step === 0 && !passengersValid) || soldOut}
                      className="flex-1 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
                    >
                      {step === 0 ? "המשך לשירותים" : step === 1 ? "המשך לסיכום" : "המשך לתשלום"}
                    </button>
                  ) : (
                    <button
                      onClick={confirm}
                      disabled={busy || soldOut || !paymentValid}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
                    >
                      {payMethod === "card" ? (
                        <CreditCard className="h-4 w-4" />
                      ) : (
                        <Wallet className="h-4 w-4" />
                      )}
                      {busy ? "מאשר…" : changed ? "מאשר מחיר חדש ומזמין" : "אישור סופי והזמנה"}
                    </button>
                  )}
                </div>
              )}

              {step === 0 && !passengersValid && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  נא למלא את כל פרטי הנוסעים ופרטי הקשר.
                </p>
              )}

              <div className="mt-5 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> תשלום מאובטח
                </span>
                <span className="flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> מחיר מאומת
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> מדיניות ביטול
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function updatePassenger(
  set: React.Dispatch<React.SetStateAction<Passenger[]>>,
  index: number,
  patch: Partial<Passenger>,
) {
  set((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-right">
      <span className="mb-1 block text-[12px] font-bold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-foreground">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-bold">{value}</span>
    </div>
  );
}
