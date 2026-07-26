import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Calendar, CheckCircle2, Clock, MapPin, Plane, Share2,
  Shield, ShieldCheck, Sparkles, Star, Timer, Utensils, Wallet, XCircle, RefreshCw, Bookmark, Lock,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { SignInModal } from "@/components/SignInModal";
import { getDeal, revalidateDeal, type Deal, type RevalidationResult } from "@/lib/deals";
import { isAuthenticated, setAuthIntent, subscribe } from "@/lib/auth-stub";

export const Route = createFileRoute("/deal/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `דיל ל${decodeURIComponent(params.id)} — NITZI` },
      { name: "description", content: `חבילת נופש מלאה ל${decodeURIComponent(params.id)}: טיסות, מלון, אטרקציות ומחיר מאומת.` },
      { property: "og:title", content: `דיל ל${decodeURIComponent(params.id)} — NITZI` },
      { property: "og:description", content: "טיסה + מלון + מסלול. מחיר נבדק ואומת מול הספק." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DealPage,
});

function fmtILS(n: number) { return `₪${Math.round(n).toLocaleString()}`; }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDur(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}ש׳ ${m ? `${m}ד׳` : ""}`.trim();
}
function agoLabel(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `לפני ${s} שנ׳`;
  const m = Math.floor(s / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  return `לפני ${h} ש׳`;
}

function DealPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(() => getDeal(id));
  const [refreshing, setRefreshing] = useState(false);
  const [revalidation, setRevalidation] = useState<RevalidationResult | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setAuthed(isAuthenticated());
    const unsub = subscribe((u) => setAuthed(!!u));
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { unsub(); clearInterval(t); };
  }, []);

  if (!deal) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">הדיל לא נמצא</h1>
          <p className="mt-2 text-sm text-muted-foreground">ייתכן שהדיל התחלף או שהקישור פג תוקף.</p>
          <Link to="/" className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow">חזרה לבית</Link>
        </div>
      </div>
    );
  }

  const dest = deal.destination;
  const priceAgeMs = now - new Date(deal.price.verifiedAt).getTime();
  const stale = priceAgeMs > deal.price.ttlSeconds * 1000;

  const refresh = async () => {
    setRefreshing(true);
    const res = await revalidateDeal(deal);
    setDeal(res.deal);
    setRevalidation(res);
    setRefreshing(false);
    setTimeout(() => setRevalidation(null), 4000);
  };

  const startBooking = async () => {
    if (!authed) {
      setAuthIntent(`/deal/${deal.id}`);
      setSignInOpen(true);
      return;
    }
    setCheckoutOpen(true);
    // Re-validate price before checkout — the trust contract
    setRefreshing(true);
    const res = await revalidateDeal(deal);
    setDeal(res.deal);
    setRevalidation(res);
    setRefreshing(false);
  };

  const availabilityChip = useMemo(() => {
    if (deal.price.availability === "sold-out") return { text: "אזל המלאי", cls: "bg-rose-100 text-rose-800" };
    if (deal.price.availability === "limited") return { text: "מקומות אחרונים", cls: "bg-amber-100 text-amber-900" };
    return { text: "זמין להזמנה", cls: "bg-emerald-100 text-emerald-800" };
  }, [deal.price.availability]);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => navigate({ to: "/" })} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" aria-label="חזרה">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (!authed) { setAuthIntent(`/deal/${deal.id}`); setSignInOpen(true); return; }
                setSaved((s) => !s);
              }}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
              aria-label="שמור"
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
            </button>
            <button
              onClick={() => { if (navigator.share) navigator.share({ title: dest.name, url: window.location.href }).catch(() => {}); }}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
              aria-label="שתף"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:pt-6">
        {/* Gallery + Sticky booking */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* Hero image */}
            <section className="relative overflow-hidden rounded-[2rem] shadow-glow animate-fade-up">
              <img src={dest.image} alt={dest.name} className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[480px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {deal.secret && (
                <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
                  <Sparkles className="h-3.5 w-3.5" /> הדיל הסודי של NITZI
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 p-5 text-white sm:p-6">
                <p className="text-[11px] font-bold text-white/85">{dest.country} {dest.emoji}</p>
                <h1 className="text-3xl font-black leading-tight drop-shadow-md sm:text-4xl lg:text-5xl">{dest.name}</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">{deal.title}</p>
              </div>
            </section>

            {/* Trust bar */}
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-soft animate-fade-up">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-900">
                  <BadgeCheck className="h-5 w-5" />
                  <span className="font-black">מחיר נבדק ואומת</span>
                </div>
                <span className="text-[11px] text-emerald-800">מקור: {deal.price.source} · עודכן {agoLabel(deal.price.verifiedAt)}</span>
                <span className={`ms-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${availabilityChip.cls}`}>{availabilityChip.text}</span>
                <button
                  onClick={refresh}
                  disabled={refreshing}
                  className="flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> בדוק מחיר עכשיו
                </button>
              </div>
              {stale && (
                <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-800">
                  <Timer className="h-3 w-3" /> ההצעה מוצגת מעל 15 דקות — לחץ "בדוק מחיר עכשיו" לאימות מחודש.
                </p>
              )}
              {revalidation && (
                <RevalidationBanner res={revalidation} />
              )}
            </section>

            {/* Hotel */}
            <Section title="המלון" icon={<MapPin className="h-4 w-4" />}>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground">{deal.hotel.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Stars n={deal.hotel.stars} />
                    <span>· {deal.hotel.stars} כוכבים</span>
                    <span>· דירוג אורחים {deal.hotel.guestRating.toFixed(1)}/10</span>
                    <span>· {deal.hotel.reviewsCount.toLocaleString()} ביקורות</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{deal.hotel.note}</p>
                </div>
                <div className="grid place-items-center rounded-2xl bg-gradient-sunset px-3 py-2 text-white shadow-glow">
                  <div className="text-[9px] font-bold uppercase tracking-widest opacity-90">דירוג</div>
                  <div className="text-xl font-black leading-none">{deal.hotel.guestRating.toFixed(1)}</div>
                </div>
              </div>
            </Section>

            {/* Flights */}
            <Section title="פרטי הטיסות" icon={<Plane className="h-4 w-4" />}>
              <FlightLine label="הלוך" f={deal.outbound} />
              <div className="my-3 h-px bg-border" />
              <FlightLine label="חזור" f={deal.inbound} />
            </Section>

            {/* Dates */}
            <Section title="תאריכים ומשך" icon={<Calendar className="h-4 w-4" />}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Info label="יציאה" value={fmtDate(deal.dates.start)} />
                <Info label="חזרה" value={fmtDate(deal.dates.end)} />
                <Info label="מספר לילות" value={`${deal.dates.nights}`} />
              </div>
            </Section>

            {/* Includes / excludes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Section title="מה כלול" icon={<CheckCircle2 className="h-4 w-4" />}>
                <ul className="space-y-2 text-sm">
                  {deal.includes.map((i) => (
                    <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {i}</li>
                  ))}
                </ul>
              </Section>
              <Section title="מה לא כלול" icon={<XCircle className="h-4 w-4" />}>
                <ul className="space-y-2 text-sm">
                  {deal.excludes.map((i) => (
                    <li key={i} className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" /> {i}</li>
                  ))}
                </ul>
              </Section>
            </div>

            {/* Map */}
            <Section title="על המפה" icon={<MapPin className="h-4 w-4" />}>
              <div className="relative h-52 overflow-hidden rounded-2xl border border-border">
                <div className="absolute inset-0 bg-gradient-ocean opacity-80" />
                <div className="absolute inset-0" style={{
                  backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.25) 0 2px, transparent 3px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.2) 0 2px, transparent 3px)",
                }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-glow animate-pulse-glow">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="mt-1 text-xs font-black text-white drop-shadow">{dest.name}</div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">מפה אינטראקטיבית תתווסף בגרסה הבאה.</p>
            </Section>

            {/* Attractions */}
            <Section title="אטרקציות מומלצות" icon={<Sparkles className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                {deal.attractions.map((a) => (
                  <span key={a} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">✦ {a}</span>
                ))}
              </div>
            </Section>

            {/* Restaurants */}
            <Section title="מסעדות נבחרות" icon={<Utensils className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm">
                {deal.restaurants.map((r) => (
                  <li key={r} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{r}</li>
                ))}
              </ul>
            </Section>

            {/* Cancellation */}
            <Section title="תנאי ביטול" icon={<Shield className="h-4 w-4" />}>
              <p className="text-sm text-foreground">{deal.cancellation}</p>
            </Section>

            {/* Transparency */}
            <Section title="שקיפות NITZI" icon={<ShieldCheck className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />מקור הנתונים: {deal.price.source}</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />זמן העדכון האחרון: {agoLabel(deal.price.verifiedAt)}</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />סטטוס זמינות: {availabilityChip.text}</li>
                <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />לפני התשלום נבצע בדיקת מחיר נוספת ונציג לך כל שינוי לפני חיוב.</li>
              </ul>
            </Section>
          </div>

          {/* Sticky booking panel — desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              <BookingCard
                deal={deal}
                onBook={startBooking}
                availabilityChip={availabilityChip}
                refreshing={refreshing}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky book bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-glow backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">מחיר לאדם</div>
            <div className="text-xl font-black text-foreground">{fmtILS(deal.price.perPerson)}</div>
            <div className="text-[10px] text-muted-foreground">סה״כ {fmtILS(deal.price.total)} ל־{deal.people} נוסעים</div>
          </div>
          <button
            onClick={startBooking}
            disabled={deal.price.availability === "sold-out"}
            className="ms-auto flex items-center gap-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
          >
            {!authed && <Lock className="h-4 w-4" />}
            הזמן עכשיו
          </button>
        </div>
      </div>

      <SignInModal
        open={signInOpen}
        onClose={(signed) => {
          setSignInOpen(false);
          if (signed) startBooking();
        }}
        reason="כדי להתקדם להזמנה צריך חשבון NITZI."
      />

      {checkoutOpen && (
        <CheckoutModal
          deal={deal}
          revalidation={revalidation}
          refreshing={refreshing}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}

function RevalidationBanner({ res }: { res: RevalidationResult }) {
  if (res.status === "verified") {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-2 text-[12px] font-bold text-emerald-900">
        <BadgeCheck className="h-4 w-4" /> המחיר נבדק מחדש והוא תקף. תוכל להמשיך בביטחון.
      </div>
    );
  }
  if (res.status === "changed") {
    return (
      <div className="mt-2 rounded-2xl bg-amber-100 px-3 py-2 text-[12px] font-bold text-amber-900">
        <div className="flex items-center gap-2"><Timer className="h-4 w-4" /> הספק עדכן את המחיר.</div>
        <div className="mt-1">
          מחיר קודם: <span className="line-through">{fmtILS(res.oldPrice)}</span> · חדש: <span className="text-base font-black">{fmtILS(res.newPrice)}</span>. לא תחויב ללא אישור מפורש.
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl bg-rose-100 px-3 py-2 text-[12px] font-bold text-rose-900">
      <XCircle className="h-4 w-4" /> לצערנו הדיל אזל בזמן שצפית בו. בוא נמצא לך אלטרנטיבה.
    </div>
  );
}

function BookingCard({
  deal, onBook, availabilityChip, refreshing,
}: {
  deal: Deal;
  onBook: () => void;
  availabilityChip: { text: string; cls: string };
  refreshing: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${availabilityChip.cls}`}>{availabilityChip.text}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-800">
          <BadgeCheck className="h-3 w-3" /> מחיר מאומת
        </span>
      </div>
      <div className="mt-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">מחיר לאדם</div>
        <div className="text-4xl font-black text-foreground">{fmtILS(deal.price.perPerson)}</div>
        <div className="text-xs text-muted-foreground">סה״כ {fmtILS(deal.price.total)} · {deal.people} נוסעים</div>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-foreground">
        <li className="flex gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /> {fmtDate(deal.dates.start)} → {fmtDate(deal.dates.end)}</li>
        <li className="flex gap-2"><Plane className="h-3.5 w-3.5 text-primary" /> {deal.outbound.airline} · {deal.outbound.stops === 0 ? "ישירה" : `${deal.outbound.stops} עצירות`}</li>
        <li className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> {deal.hotel.name}</li>
      </ul>
      <button
        onClick={onBook}
        disabled={deal.price.availability === "sold-out" || refreshing}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" /> הזמן עכשיו
      </button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        לפני החיוב נבצע בדיקת מחיר נוספת ונציג כל שינוי לאישורך.
      </p>
    </div>
  );
}

function CheckoutModal({
  deal, revalidation, refreshing, onClose,
}: {
  deal: Deal;
  revalidation: RevalidationResult | null;
  refreshing: boolean;
  onClose: () => void;
}) {
  const changed = revalidation?.status === "changed";
  const soldOut = revalidation?.status === "sold-out" || deal.price.availability === "sold-out";
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] border border-border bg-card p-6 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-black text-foreground">בדיקת מחיר לפני התשלום</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            אנחנו מוודאים שהמחיר שראית עדיין תקף מול הספק.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          {refreshing ? (
            <div className="flex items-center gap-2 text-foreground">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" /> בודק מול {deal.price.source}…
            </div>
          ) : soldOut ? (
            <div className="text-rose-800">
              <div className="flex items-center gap-2 font-black"><XCircle className="h-4 w-4" /> אזל המלאי</div>
              <p className="mt-1 text-[12px]">הדיל נסגר בזמן שהתקדמנו. לא בוצע חיוב. נשמח למצוא לך אלטרנטיבה דומה.</p>
            </div>
          ) : changed ? (
            <div className="text-amber-900">
              <div className="flex items-center gap-2 font-black"><Timer className="h-4 w-4" /> המחיר השתנה</div>
              <p className="mt-1 text-[12px]">
                מחיר קודם: <span className="line-through">{fmtILS(revalidation!.status === "changed" ? revalidation.oldPrice : 0)}</span><br />
                מחיר חדש: <span className="text-base font-black">{fmtILS(deal.price.total)}</span>
              </p>
              <p className="mt-1 text-[11px]">לא תחויב ללא אישור מפורש שלך.</p>
            </div>
          ) : (
            <div className="text-emerald-800">
              <div className="flex items-center gap-2 font-black"><BadgeCheck className="h-4 w-4" /> המחיר אומת</div>
              <p className="mt-1 text-[12px]">אתה תשלם בדיוק את מה שראית: <span className="font-black">{fmtILS(deal.price.total)}</span>.</p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <Row label="חבילה" value={`${deal.destination.name} · ${deal.dates.nights} לילות`} />
          <Row label="נוסעים" value={`${deal.people}`} />
          <Row label="מחיר לאדם" value={fmtILS(deal.price.perPerson)} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-black">
            <span>סה״כ לתשלום</span>
            <span className="text-gradient-sunset">{fmtILS(deal.price.total)}</span>
          </div>
        </div>

        {!confirmed ? (
          <button
            onClick={() => setConfirmed(true)}
            disabled={soldOut || refreshing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
          >
            {changed ? "אני מאשר את המחיר החדש" : "המשך לתשלום"}
          </button>
        ) : (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-900">
            <div className="text-2xl">🎉</div>
            <div className="mt-1 font-black">תודה! ההזמנה תושלם בגרסת הפרודקשן.</div>
            <p className="mt-1 text-[11px]">בגל הבא נחבר את NITZI לספק אמיתי ולתשלום מאובטח.</p>
          </div>
        )}

        <button onClick={onClose} className="mt-3 w-full rounded-2xl border border-border bg-card py-2.5 text-sm font-bold text-foreground">
          חזרה
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-soft backdrop-blur animate-fade-up">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-sunset text-white">{icon}</span>
        <h3 className="text-sm font-black text-foreground">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-black text-foreground">{value}</div>
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

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} כוכבים`}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

function FlightLine({ label, f }: { label: string; f: Deal["outbound"] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-ocean text-white">
        <Plane className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">{label}</div>
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span>{fmtTime(f.departAt)}</span>
          <span className="text-muted-foreground">→</span>
          <span>{fmtTime(f.arriveAt)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>{f.airline} · {f.flightNumber}</span>
          <span><Clock className="mr-0.5 inline h-3 w-3" /> {fmtDur(f.durationMinutes)}</span>
          <span>· {f.stops === 0 ? "ישירה" : `${f.stops} עצירות`}</span>
          <span>· {fmtDate(f.departAt)}</span>
        </div>
      </div>
    </div>
  );
}
