// LIVE checkout — a streamlined but fully functional parallel to the demo
// 5-step checkout. Never trusts a client price as the charge amount: the
// server (placeLiveBooking) always re-resolves the offer itself immediately
// before writing anything, and a price mismatch stops the booking and
// requires the customer to explicitly re-accept the new price shown here —
// never auto-approved, never charged on the first mismatch.

import { useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  CreditCard,
  Info,
  Loader2,
  ShieldQuestion,
  TimerOff,
  Wallet,
  XCircle,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { dealResolutionQueryOptions } from "@/lib/deal-resolution.functions";
import { placeLiveBooking } from "@/lib/live-booking.functions";
import type { OfferResolution } from "@/lib/offers/resolution";

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

function Header() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
          aria-label="חזרה לעמוד הבית"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <NitziLogo />
        <span className="w-11" />
      </div>
    </header>
  );
}

function StateScreen({
  icon,
  tone,
  title,
  detail,
}: {
  icon: React.ReactNode;
  tone: "info" | "warning" | "error";
  title: string;
  detail: string;
}) {
  const toneClass =
    tone === "error"
      ? "bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-900"
        : "bg-sky-50 text-sky-900";
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
        <span className={`grid h-16 w-16 place-items-center rounded-full ${toneClass}`}>
          {icon}
        </span>
        <h1 className="text-2xl font-black text-foreground">{title}</h1>
        <p className="text-sm font-semibold text-muted-foreground">{detail}</p>
        <Link
          to="/packages"
          className="mt-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow"
        >
          חיפוש חבילות
        </Link>
      </main>
    </div>
  );
}

interface Passenger {
  firstName: string;
  lastName: string;
  birthDate: string;
  passport: string;
  passportExpiry: string;
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
  const id = useId();
  return (
    <label htmlFor={id} className="block text-right">
      <span className="mb-1 block text-[12px] font-bold text-muted-foreground">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function LiveCheckoutForm({
  canonicalId,
  result,
}: {
  canonicalId: string;
  result: OfferResolution;
}) {
  const offer = result.refreshedOffer!;
  const submit = useServerFn(placeLiveBooking);
  const idemKey = useRef<string | null>(null);

  const [passengers, setPassengers] = useState<Passenger[]>([
    { firstName: "", lastName: "", birthDate: "", passport: "", passportExpiry: "" },
  ]);
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [payMethod, setPayMethod] = useState<"card" | "apple" | "google" | "bit">("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [priceChangeNotice, setPriceChangeNotice] = useState<{
    previous: number;
    current: number;
  } | null>(null);
  const [acceptedPrice, setAcceptedPrice] = useState(result.currentPrice ?? 0);
  const [placed, setPlaced] = useState<{ id: string; paymentStatus: string } | null>(null);

  const updatePassenger = (i: number, patch: Partial<Passenger>) =>
    setPassengers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const passengersValid = passengers.every((p) => p.firstName.trim() && p.lastName.trim());
  const contactValid = /\S+@\S+\.\S+/.test(contact.email);

  const confirm = async () => {
    setError(null);
    setPriceChangeNotice(null);
    setBusy(true);
    if (!idemKey.current) idemKey.current = crypto.randomUUID();
    try {
      const res = await submit({
        data: {
          canonicalId,
          idempotencyKey: idemKey.current,
          passengers,
          extras: [],
          contact,
          paymentMethod: payMethod,
          acceptedPricePerPerson: acceptedPrice,
        },
      });

      if (res.ok) {
        // payment_status exists on every booking row at runtime (see the
        // payment_status migration + bookings.functions.ts/live-booking.functions.ts)
        // but the generated src/integrations/supabase/types.ts hasn't been
        // regenerated since — same documented, narrow cast already used in
        // checkout.$id.tsx, not a new workaround.
        const row = res.booking as unknown as { id: string; payment_status: string };
        setPlaced({ id: row.id, paymentStatus: row.payment_status });
        return;
      }

      if (res.status === "price_changed" && res.currentPricePerPerson !== null) {
        setPriceChangeNotice({ previous: acceptedPrice, current: res.currentPricePerPerson });
        setAcceptedPrice(res.currentPricePerPerson);
        return;
      }

      const messages: Record<string, { title: string; detail: string }> = {
        availability_changed: {
          title: "הזמינות השתנתה",
          detail: "חלק מפרטי ההצעה כבר לא זמינים. אפשר לחזור ולחפש שוב.",
        },
        expired: { title: "ההצעה פגה", detail: "יש לבצע חיפוש חדש." },
        sold_out: { title: "אזל המלאי", detail: "החבילה כבר לא זמינה." },
        provider_unavailable: {
          title: "לא ניתן לאמת מול הספק",
          detail: "נסו שוב בעוד מספר דקות.",
        },
        not_found: { title: "ההצעה לא נמצאה", detail: "ייתכן שהקישור שגוי." },
        unsupported: { title: "לא ניתן להשלים את ההזמנה כרגע", detail: "חסרים נתונים מהספק." },
        payment_failed: { title: "החיוב לא הושלם", detail: "לא בוצע חיוב. אפשר לנסות שוב." },
      };
      setError(
        messages[res.status ?? ""] ?? {
          title: "משהו השתבש",
          detail: "לא בוצע חיוב. אפשר לנסות שוב.",
        },
      );
    } catch {
      setError({ title: "משהו השתבש", detail: "ייתכן שהייתה בעיית תקשורת. אפשר לנסות שוב." });
    } finally {
      setBusy(false);
    }
  };

  if (placed) {
    return (
      <div dir="rtl" className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-lg px-6 py-20 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-3 text-3xl font-black text-foreground">ההזמנה אושרה</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            מספר הזמנה:{" "}
            <span className="font-black text-foreground">
              {placed.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
          {placed.paymentStatus === "paid" ? (
            <div className="mx-auto mt-4 max-w-md rounded-2xl bg-emerald-50 px-4 py-2.5 text-[12px] font-black text-emerald-800">
              התשלום אושר ונקלט
            </div>
          ) : (
            <div className="mx-auto mt-4 max-w-md rounded-2xl bg-amber-50 px-4 py-2.5 text-[12px] font-black text-amber-900">
              הזמנת הדגמה — לא בוצע חיוב אמיתי
            </div>
          )}
          <Link
            to="/account"
            className="mt-6 inline-block rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow"
          >
            לאזור האישי
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <Header />
      <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-black">פרטי הזמנה</h1>
        <p className="text-sm text-muted-foreground">
          {offer.destination.city}, {offer.destination.country} · {offer.hotel.name}
        </p>

        {priceChangeNotice && (
          <div role="alert" className="rounded-3xl border border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-[13px] font-black text-amber-900">
              <Info className="h-4 w-4 shrink-0" aria-hidden /> המחיר התעדכן מאז שנצפה לראשונה
            </p>
            <p className="mt-1 text-[12px] font-semibold text-amber-800">
              {fmtILS(priceChangeNotice.previous)} ← {fmtILS(priceChangeNotice.current)}. לחצו שוב
              על "אישור סופי" כדי לאשר את המחיר החדש ולנסות שוב.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-rose-900"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="text-[12px] font-black">{error.title}</p>
              <p className="mt-0.5 text-[12px] font-semibold">{error.detail}</p>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-black">פרטי נוסע</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="שם פרטי"
              value={passengers[0].firstName}
              onChange={(v) => updatePassenger(0, { firstName: v })}
            />
            <Field
              label="שם משפחה"
              value={passengers[0].lastName}
              onChange={(v) => updatePassenger(0, { lastName: v })}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-black">יצירת קשר</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="אימייל"
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
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-black">אמצעי תשלום</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["card", "bit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-black ${
                  payMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                {m === "card" ? <CreditCard className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                {m === "card" ? "כרטיס אשראי" : "Bit"}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-1.5">
          {offer.hotel.cancellationPolicy.kind === "unknown" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              <ShieldQuestion className="h-3 w-3" aria-hidden /> מדיניות ביטול טרם אומתה
            </span>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          לחיצה על "אישור סופי" תבצע בדיקת מחיר וזמינות אחרונה מול הספק לפני כל חיוב.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              סה״כ לאדם
            </div>
            <div className="text-xl font-black">{fmtILS(acceptedPrice)}</div>
          </div>
          <button
            onClick={confirm}
            disabled={busy || !passengersValid || !contactValid}
            aria-busy={busy}
            className="ms-auto flex items-center gap-2 rounded-2xl bg-gradient-sunset px-6 py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {busy ? "בודק ומאשר…" : "אישור סופי"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LiveCheckoutView({ canonicalId }: { canonicalId: string }) {
  const { data: result } = useSuspenseQuery(dealResolutionQueryOptions(canonicalId));

  switch (result.status) {
    case "available":
    case "price_changed":
      return <LiveCheckoutForm canonicalId={canonicalId} result={result} />;
    case "expired":
      return (
        <StateScreen
          icon={<TimerOff className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="ההצעה הזו פגה"
          detail="כדאי לבצע חיפוש חדש כדי לראות מחיר וזמינות עדכניים."
        />
      );
    case "sold_out":
      return (
        <StateScreen
          icon={<XCircle className="h-7 w-7" aria-hidden />}
          tone="error"
          title="ההצעה הזו כבר לא זמינה"
          detail="החדר או הטיסה שביקשתם אזלו."
        />
      );
    case "availability_changed":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="הזמינות של ההצעה השתנתה"
          detail="מומלץ לחפש שוב כדי לראות את האפשרויות העדכניות."
        />
      );
    case "provider_unavailable":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="לא ניתן לאמת את ההצעה כרגע"
          detail="יש בעיה זמנית בתקשורת מול הספק. נסו שוב בעוד מספר דקות."
        />
      );
    case "unsupported":
      return (
        <StateScreen
          icon={<Info className="h-7 w-7" aria-hidden />}
          tone="info"
          title="לא ניתן להציג את ההצעה במלואה כרגע"
          detail="חלק מהנתונים הדרושים טרם זמינים מהספק עבור הצעה זו."
        />
      );
    case "not_found":
    default:
      return (
        <StateScreen
          icon={<Clock className="h-7 w-7" aria-hidden />}
          tone="info"
          title="ההצעה לא נמצאה"
          detail="ייתכן שהקישור שגוי או שההצעה כבר לא קיימת."
        />
      );
  }
}
