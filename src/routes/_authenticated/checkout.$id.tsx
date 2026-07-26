// Checkout — protected route. Runs one final Price Revalidation before charging.
// After confirm, we insert a booking row into the DB so the user sees it in their
// personal area under /account?tab=bookings.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, BadgeCheck, CheckCircle2, RefreshCw, ShieldCheck, Timer, Wallet, XCircle,
} from "lucide-react";
import { getDeal, revalidateDeal, type Deal, type RevalidationResult } from "@/lib/deals";
import { createBooking } from "@/lib/user-data";
import { NitziLogo } from "@/components/NitziLogo";

export const Route = createFileRoute("/_authenticated/checkout/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `אישור הזמנה — NITZI` },
      { name: "description", content: `סיום ההזמנה ל${decodeURIComponent(params.id)} עם בדיקת מחיר לפני חיוב.` },
      { property: "og:title", content: "אישור הזמנה — NITZI" },
      { property: "og:description", content: "בדיקת מחיר וזמינות לפני החיוב." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function fmtILS(n: number) { return `₪${Math.round(n).toLocaleString()}`; }

function CheckoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id));
  const [reval, setReval] = useState<RevalidationResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [placed, setPlaced] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!deal) return;
      const res = await revalidateDeal(deal);
      if (!alive) return;
      setDeal(res.deal); setReval(res); setBusy(false);
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!deal) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">הדיל לא נמצא</h1>
          <Link to="/" className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">חזרה לבית</Link>
        </div>
      </div>
    );
  }

  const changed = reval?.status === "changed";
  const soldOut = reval?.status === "sold-out" || deal.price.availability === "sold-out";

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const row = await createBooking(deal);
      setPlaced({ id: row.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בהזמנה");
    } finally { setBusy(false); }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-sand/60 via-background to-background pb-16">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 pt-6 sm:px-8">
        <button onClick={() => navigate({ to: "/deal/$id", params: { id } })} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <NitziLogo />
        <div className="w-10" />
      </header>

      <div className="mx-auto mt-8 w-full max-w-3xl px-5 sm:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-glow sm:p-8">
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-black text-foreground">בדיקת מחיר לפני התשלום</h1>
            <p className="mt-1 text-sm text-muted-foreground">אנחנו מאמתים את המחיר והזמינות מול הספק לפני שאתה משלם.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
            {busy && !placed ? (
              <div className="flex items-center gap-2 text-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" /> בודק מול {deal.price.source}…
              </div>
            ) : soldOut ? (
              <div className="text-rose-800">
                <div className="flex items-center gap-2 font-black"><XCircle className="h-4 w-4" /> אזל המלאי</div>
                <p className="mt-1 text-[12px]">הדיל נסגר בזמן שהתקדמנו. לא בוצע חיוב.</p>
              </div>
            ) : changed ? (
              <div className="text-amber-900">
                <div className="flex items-center gap-2 font-black"><Timer className="h-4 w-4" /> המחיר השתנה</div>
                <p className="mt-1 text-[12px]">
                  מחיר קודם: <span className="line-through">{fmtILS(reval!.status === "changed" ? reval.oldPrice : 0)}</span><br />
                  מחיר חדש: <span className="text-base font-black">{fmtILS(deal.price.total)}</span>. אישור מפורש נדרש.
                </p>
              </div>
            ) : (
              <div className="text-emerald-800">
                <div className="flex items-center gap-2 font-black"><BadgeCheck className="h-4 w-4" /> המחיר אומת</div>
                <p className="mt-1 text-[12px]">תשלם בדיוק את מה שראית: <span className="font-black">{fmtILS(deal.price.total)}</span>.</p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <Row label="חבילה" value={`${deal.destination.name} · ${deal.dates.nights} לילות`} />
            <Row label="מלון" value={deal.hotel.name} />
            <Row label="טיסה" value={`${deal.outbound.airline} · ${deal.outbound.stops === 0 ? "ישירה" : `${deal.outbound.stops} עצירות`}`} />
            <Row label="נוסעים" value={`${deal.people}`} />
            <Row label="מחיר לאדם" value={fmtILS(deal.price.perPerson)} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-black">
              <span>סה״כ לתשלום</span>
              <span className="text-gradient-sunset">{fmtILS(deal.price.total)}</span>
            </div>
          </div>

          {error && <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-[12px] font-bold text-rose-800">{error}</div>}

          {placed ? (
            <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-900">
              <div className="text-4xl">🎉</div>
              <div className="mt-2 text-lg font-black">ההזמנה אושרה!</div>
              <p className="mt-1 text-[12px]">מספר אישור: <span className="font-black">{placed.id.slice(0, 8).toUpperCase()}</span></p>
              <p className="mt-1 text-[11px]">שמרנו את ההזמנה באזור האישי שלך. בגל הבא נחבר תשלום ואישור מהספק.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link to="/account" className="rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">לאזור האישי</Link>
                <Link to="/" className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground">חזרה לבית</Link>
              </div>
            </div>
          ) : (
            <button
              onClick={confirm}
              disabled={busy || soldOut}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" />
              {changed ? "אני מאשר את המחיר החדש ומזמין" : busy ? "רגע…" : "אישור סופי והזמנה"}
            </button>
          )}

          {!placed && (
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              בגרסת ה-MVP לא מבוצע חיוב אמיתי. הזמנתך תישמר באזור האישי כרשומה מאומתת מול NITZI.
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> תשלום מאובטח</span>
            <span className="flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> מחיר מאומת</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> מדיניות ביטול</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-foreground">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
