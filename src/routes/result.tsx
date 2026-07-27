import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NitziLogo } from "@/components/NitziLogo";
import {
  ArrowLeft, Bookmark, Calendar, Clock, Cloud, GitCompare, Hotel, MapPin, Package as PackageIcon,
  Plane, Share2, Sparkles, Star, Utensils, Wallet, Wand2,
} from "lucide-react";
import { defaultAnswers, pickDestination, tripTypes, styles, type QuizAnswers } from "@/lib/nitzi-data";
import { getProviders } from "@/lib/providers/registry";
import type { Flight, Hotel as HotelT, Package as PackageT } from "@/lib/providers/types";
import { budgetFit, rank, scoreFlight, scoreHotel, scorePackage } from "@/lib/ranking";
import { amenityLabel, explainFlight, explainHotel, explainPackage } from "@/lib/explain";
import { setResultsCache } from "@/lib/results-cache";
import { isCompared, toggleCompare, useCompare } from "@/lib/compare-store";
import { CompareBar } from "@/components/CompareBar";
import { WhyNitziButton } from "@/components/WhyNitziButton";



export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "החופשה שלך — NITZI" },
      { name: "description", content: "הצעת חופשה בהתאמה אישית מ-NITZI: יעד, מסלול, מלונות, מזג אוויר ותקציב." },
      { property: "og:title", content: "החופשה המושלמת שלך מוכנה" },
      { property: "og:description", content: "יעד, מסלול יומי, מלונות ואטרקציות — הכל בפנים." },
    ],
  }),
  component: Result,
});

function Result() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hotels, setHotels] = useState<(HotelT & { score: number })[]>([]);
  const [flights, setFlights] = useState<(Flight & { score: number })[]>([]);
  const [packages, setPackages] = useState<(PackageT & { score: number })[]>([]);


  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nitzi:answers");
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
    const t = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(t);
  }, []);


  const dest = useMemo(() => pickDestination(answers), [answers]);

  useCompare(); // subscribe so compare buttons re-render

  useEffect(() => {
    let cancelled = false;
    const providers = getProviders();
    const ctx = { answers, destination: dest };
    (async () => {
      const [h, f, p] = await Promise.all([
        providers.hotels.search(ctx, { limit: 10 }),
        providers.flights.search(ctx, { limit: 6 }),
        providers.packages.search(ctx, { limit: 4 }),
      ]);
      if (cancelled) return;
      const prices = f.map((x) => x.price);
      const rankedH = rank(h, (x) => scoreHotel(x, answers));
      const rankedF = rank(f, (x) => scoreFlight(x, answers, prices));
      const rankedP = rank(p, (x) => scorePackage(x, answers));
      setHotels(rankedH);
      setFlights(rankedF);
      setPackages(rankedP);
      setResultsCache({
        answers, destinationName: dest.name,
        hotels: rankedH, flights: rankedF, packages: rankedP,
        savedAt: Date.now(),
      });
    })();
    return () => { cancelled = true; };
  }, [answers, dest]);


  const cheapestFlight = useMemo(() => flights.slice().sort((a, b) => a.price - b.price)[0], [flights]);
  const fastestFlight = useMemo(() => flights.slice().sort((a, b) => a.durationMinutes - b.durationMinutes)[0], [flights]);

  const total = answers.budget * answers.people;
  const enoughBudget = answers.budget >= dest.avgBudgetPerPerson * 0.85;
  const matchScore = useMemo(() => {
    const base = 82;
    const typeMatch = answers.type && dest.matches.includes(answers.type) ? 12 : 4;
    const budgetMatch = enoughBudget ? 4 : -3;
    return Math.max(70, Math.min(99, base + typeMatch + budgetMatch));
  }, [answers.type, dest, enoughBudget]);

  const typeLabel = tripTypes.find((t) => t.id === answers.type)?.label ?? "חופשה";
  const styleLabel = styles.find((s) => s.id === answers.style)?.label ?? "";

  const share = async () => {
    const text = `${dest.name}, ${dest.country} — נבנה לי על ידי NITZI ✨`;
    if (navigator.share) {
      try { await navigator.share({ title: "NITZI", text, url: window.location.href }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div dir="rtl" className="relative min-h-screen bg-background pb-24">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gradient-sunset opacity-30 blur-3xl" />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <button onClick={() => navigate({ to: "/quiz" })} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" aria-label="חזרה">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <div className="flex gap-1">
            <button onClick={() => setSaved((s) => !s)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" aria-label="שמור">
              <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
            </button>
            <button onClick={share} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card" aria-label="שתף">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-5 pt-5">
        {/* Hero image */}
        <section className="relative mx-5 overflow-hidden rounded-[2rem] shadow-glow animate-fade-up">
          <img src={dest.image} alt={dest.name} width={800} height={1000} className="h-[380px] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> ההמלצה של NITZI
          </div>
          <div className="absolute top-4 left-4 grid place-items-center rounded-2xl bg-gradient-sunset px-3 py-2 text-white shadow-glow">
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-90">התאמה</div>
            <div className="text-xl font-black leading-none">{matchScore}%</div>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs font-bold text-white/85">{dest.country} {dest.emoji}</p>
            <h1 className="text-4xl font-black leading-tight drop-shadow-md">{dest.name}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{dest.tagline}</p>
          </div>
        </section>

        {/* Quick stats */}
        <div className="mx-5 grid grid-cols-3 gap-2">
          <MiniStat icon={<Cloud className="h-4 w-4" />} label="מזג אוויר" value={dest.weather} />
          <MiniStat icon={<Plane className="h-4 w-4" />} label="טיסה מישראל" value={`${dest.flightHours} שעות`} />
          <MiniStat icon={<Calendar className="h-4 w-4" />} label="משך" value={`${answers.days} ימים`} />
        </div>

        {/* Why */}
        <Card>
          <SectionTitle icon={<Wand2 className="h-4 w-4" />} title="למה זה מתאים לך" />
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            <Li>בחרת {typeLabel} — {dest.name} מספק/ת בדיוק את זה.</Li>
            {styleLabel && <Li>סגנון {styleLabel} מתאים לאווירה של היעד.</Li>}
            <Li>{answers.days} ימים = טיים־פריים מושלם לחוויה בלי להתעייף.</Li>
            <Li>{answers.people} נוסעים — התאמתי מלונות ומסלול בהתאם.</Li>
          </ul>
        </Card>

        {/* Budget check */}
        <Card>
          <SectionTitle icon={<Wallet className="h-4 w-4" />} title="בדיקת תקציב" />
          <div className={`mt-3 rounded-2xl p-4 text-sm font-semibold ${enoughBudget ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
            {enoughBudget
              ? `התקציב שלך (₪${answers.budget.toLocaleString()} לאדם) מספיק בהחלט. ממוצע ליעד: ₪${dest.avgBudgetPerPerson.toLocaleString()}.`
              : `התקציב קצת דחוק — הממוצע ל${dest.name} הוא כ־₪${dest.avgBudgetPerPerson.toLocaleString()} לאדם. תוכל לחסוך במלונות או לשקול תאריכים גמישים.`}
          </div>
        </Card>

        {/* Itinerary */}
        <Card>
          <SectionTitle icon={<Calendar className="h-4 w-4" />} title="המסלול היומי" />
          <ol className="mt-4 space-y-3">
            {dest.itinerary.slice(0, answers.days).map((d, i) => (
              <li key={i} className="relative flex gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-sunset text-sm font-black text-white shadow-glow">{i + 1}</div>
                <div>
                  <p className="text-[11px] font-bold text-primary">יום {i + 1}</p>
                  <p className="text-sm leading-relaxed text-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Map placeholder */}
        <Card>
          <SectionTitle icon={<MapPin className="h-4 w-4" />} title="על המפה" />
          <div className="relative mt-3 h-40 overflow-hidden rounded-2xl border border-border">
            <div className="absolute inset-0 bg-gradient-ocean opacity-80" />
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.35) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.25) 0 2px, transparent 3px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.2) 0 2px, transparent 3px)",
            }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-glow animate-pulse-glow">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="mt-1 text-center text-xs font-black text-white drop-shadow">{dest.name}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">מפה אינטראקטיבית תתווסף בגרסה הבאה</p>
        </Card>

        {/* NITZI's Picks — top curated by AI */}
        <section className="mx-5 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card/90 to-card/80 p-5 shadow-glow backdrop-blur animate-fade-up">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-sunset text-white shadow-glow">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-black text-foreground">הבחירות של NITZI</h3>
                <p className="text-[11px] text-muted-foreground">נבחרו עבורך לפי התקציב, הסגנון וההעדפות</p>
              </div>
            </div>
          </div>

          {hotels.length === 0 || flights.length === 0 ? (
            <div className="mt-4 space-y-2"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
          ) : (
            <div className="mt-4 space-y-3">
              {packages[0] && (
                <PickWrap kind="חבילה מומלצת" reason="הכי משתלמת ומאוזנת ליעד שלך">
                  <PackageRow pkg={packages[0]} answers={answers} />
                </PickWrap>
              )}
              {hotels.slice(0, 2).map((h, i) => (
                <PickWrap key={h.id} kind={i === 0 ? "המלון המושלם" : "אלטרנטיבה מצוינת"} reason={i === 0 ? "הציון הגבוה ביותר בהתאמה אישית" : "איזון טוב בין מחיר לאיכות"}>
                  <HotelRow hotel={h} answers={answers} />
                </PickWrap>
              ))}
              {flights[0] && (
                <PickWrap kind="הטיסה הכי חכמה" reason="שילוב מנצח של מחיר, זמן ונוחות">
                  <FlightRow flight={flights[0]} cheapest={cheapestFlight} fastest={fastestFlight} answers={answers} />
                </PickWrap>
              )}
            </div>
          )}

          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            {showAll ? "הסתר את כל האפשרויות" : "הצג את כל האפשרויות"}
            <span className="text-[10px] font-semibold text-muted-foreground">
              ({hotels.length} מלונות · {flights.length} טיסות · {packages.length} חבילות)
            </span>
          </button>
        </section>

        {showAll && (
          <>
            {/* Flights */}
            <Card>
              <SectionTitle icon={<Plane className="h-4 w-4" />} title="כל הטיסות" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                מדורג לפי מחיר, עצירות, משך וזמני יציאה נוחים
              </p>
              <div className="mt-3 space-y-2">
                {flights.map((f) => (
                  <FlightRow key={f.id} flight={f} cheapest={cheapestFlight} fastest={fastestFlight} answers={answers} />
                ))}
              </div>
            </Card>

            {/* Hotels */}
            <Card>
              <SectionTitle icon={<Hotel className="h-4 w-4" />} title="כל המלונות" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {hotels.length} תוצאות מדורגות לפי התאמה, איכות וערך
              </p>
              <div className="mt-3 space-y-2">
                {hotels.map((h) => (
                  <HotelRow key={h.id} hotel={h} answers={answers} />
                ))}
              </div>
            </Card>

            {/* Packages */}
            <Card>
              <SectionTitle icon={<PackageIcon className="h-4 w-4" />} title="כל החבילות" />
              <p className="mt-1 text-[11px] text-muted-foreground">טיסה + מלון במחיר משתלם יותר</p>
              <div className="mt-3 space-y-2">
                {packages.map((p) => (
                  <PackageRow key={p.id} pkg={p} answers={answers} />
                ))}
              </div>
            </Card>
          </>
        )}



        {/* Attractions */}
        <Card>
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="אטרקציות חובה" />
          <div className="mt-3 flex flex-wrap gap-2">
            {dest.attractions.map((a) => (
              <span key={a} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">✦ {a}</span>
            ))}
          </div>
        </Card>

        {/* Restaurants */}
        <Card>
          <SectionTitle icon={<Utensils className="h-4 w-4" />} title="לאן לאכול" />
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            {dest.restaurants.map((r) => <Li key={r}>{r}</Li>)}
          </ul>
        </Card>

        {/* Budget breakdown */}
        <Card>
          <SectionTitle icon={<Wallet className="h-4 w-4" />} title="פירוט תקציב משוער" />
          <div className="mt-3 space-y-2 text-sm">
            <Row label="טיסות" value={`₪${(answers.budget * 0.35 * answers.people).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Row label={`מלון · ${answers.days} לילות`} value={`₪${(answers.budget * 0.35 * answers.people).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Row label="אוכל ובילויים" value={`₪${(answers.budget * 0.20 * answers.people).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Row label="אטרקציות ותחבורה" value={`₪${(answers.budget * 0.10 * answers.people).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-base font-black">
              <span>סה״כ מוערך</span>
              <span className="text-gradient-sunset">₪{total.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <div className="mx-5 flex flex-col gap-2 pt-2">
          <Link to="/quiz" className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-center text-sm font-black text-white shadow-glow">
            <Sparkles className="h-4 w-4" /> צור לי חופשה אחרת
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSaved((s) => !s)} className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground">
              <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} /> {saved ? "נשמר" : "שמור חופשה"}
            </button>
            <button onClick={share} className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground">
              <Share2 className="h-4 w-4" /> שתף
            </button>
          </div>
        </div>
      </div>
      <CompareBar />
    </div>
  );
}


function LoadingState() {
  const lines = [
    "NITZI חושב…",
    "מחפש את היעד המושלם…",
    "משווה בין מאות אפשרויות…",
    "מוצא מלונות מתאימים…",
    "בונה עבורך מסלול אישי…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(lines.length - 1, x + 1)), 420);
    return () => clearInterval(t);
  }, []);
  return (
    <div dir="rtl" className="grid min-h-[100dvh] place-items-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto grid h-24 w-24 place-items-center">
          <div className="absolute inset-0 rounded-full bg-gradient-sunset opacity-70 blur-2xl animate-pulse-glow" />
          <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-sunset text-white shadow-glow animate-float">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-black text-foreground">NITZI בונה לך חופשה</h2>
        <p className="mt-2 text-sm text-muted-foreground">רגע קטן — הקסם קורה</p>
        <ul className="mt-6 space-y-2 text-right text-sm">
          {lines.map((l, idx) => (
            <li
              key={l}
              className={`flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition ${idx <= i ? "opacity-100" : "opacity-30"}`}
            >
              <span className={`h-2 w-2 rounded-full ${idx <= i ? "bg-primary animate-pulse" : "bg-muted-foreground/50"}`} />
              <span className="text-foreground">{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-5 rounded-3xl border border-border/70 bg-card/80 p-5 shadow-soft backdrop-blur animate-fade-up">
      {children}
    </section>
  );
}
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-sunset text-white">{icon}</span>
      <h3 className="text-sm font-black text-foreground">{title}</h3>
    </div>
  );
}
function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}
function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-soft">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-gradient-ocean text-white">{icon}</div>
      <div className="mt-1.5 text-sm font-black text-foreground">{value}</div>
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
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

function PickWrap({ kind, reason, children }: { kind: string; reason: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-primary/25 bg-card/90 p-2 shadow-soft">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-sunset px-2.5 py-1 text-[10px] font-black text-white shadow-glow">
          <Sparkles className="h-3 w-3" /> {kind}
        </span>
        <span className="truncate text-[10px] font-semibold text-muted-foreground">{reason}</span>
      </div>
      {children}
    </div>
  );
}

function SkeletonRow() {

  return (
    <div className="h-20 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} כוכבים`}>
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

function fmtILS(n: number) {
  return `₪${Math.round(n).toLocaleString()}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDur(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}ש׳ ${m ? `${m}ד׳` : ""}`.trim();
}

function HotelRow({ hotel, answers }: { hotel: HotelT & { score: number }; answers: QuizAnswers }) {
  const fit = budgetFit(hotel, answers);
  const nights = answers.days;
  const totalStay = hotel.pricePerNight * nights;
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-ocean text-white">
          <Hotel className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{hotel.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Stars n={hotel.stars} />
                <span>· {hotel.guestRating.toFixed(1)}/10 ({hotel.reviewsCount})</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {hotel.location}
                {hotel.distanceToBeachKm != null && ` · ${hotel.distanceToBeachKm} ק״מ מהים`}
              </p>
            </div>
            <div className="shrink-0 text-left">
              <div className="text-sm font-black text-foreground">{fmtILS(hotel.pricePerNight)}</div>
              <div className="text-[10px] text-muted-foreground">ללילה</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">סה״כ {fmtILS(totalStay)}</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 5).map((a) => (
              <span key={a} className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground">
                {amenityLabel(a)}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              fit === "within" ? "bg-emerald-50 text-emerald-800"
              : fit === "slightly-over" ? "bg-amber-50 text-amber-800"
              : "bg-rose-50 text-rose-800"
            }`}>
              {fit === "within" ? "בתקציב" : fit === "slightly-over" ? "מעט מעל" : "חורג"}
            </span>
            <span className="rounded-full bg-gradient-sunset px-2 py-0.5 text-[10px] font-black text-white">
              התאמה {hotel.score}%
            </span>
          </div>
          <p className="mt-2 flex gap-1 rounded-xl bg-card/70 p-2 text-[11px] leading-relaxed text-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>{explainHotel(hotel, answers)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FlightRow({
  flight, cheapest, fastest, answers,
}: {
  flight: Flight & { score: number };
  cheapest?: Flight;
  fastest?: Flight;
  answers: QuizAnswers;
}) {
  const isCheapest = flight.id === cheapest?.id;
  const isFastest = flight.id === fastest?.id;
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-ocean text-white">
              <Plane className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{flight.airline}</p>
              <p className="text-[11px] text-muted-foreground">טיסה {flight.flightNumber}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <span>{fmtTime(flight.departAt)}</span>
            <span className="text-muted-foreground">{flight.origin}</span>
            <span className="text-muted-foreground">→</span>
            <span>{fmtTime(flight.arriveAt)}</span>
            <span className="text-muted-foreground">{flight.destination}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span><Clock className="mr-0.5 inline h-3 w-3" />{fmtDur(flight.durationMinutes)}</span>
            <span>· {flight.stops === 0 ? "ישירה" : `${flight.stops} עצירות`}</span>
            {isCheapest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">הכי משתלמת</span>}
            {isFastest && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">הכי מהירה</span>}
          </div>
        </div>
        <div className="shrink-0 text-left">
          <div className="text-sm font-black text-foreground">{fmtILS(flight.price)}</div>
          <div className="text-[10px] text-muted-foreground">לאדם</div>
          <div className="mt-1 rounded-full bg-gradient-sunset px-2 py-0.5 text-[10px] font-black text-white">
            {flight.score}%
          </div>
        </div>
      </div>
      <p className="mt-2 flex gap-1 rounded-xl bg-card/70 p-2 text-[11px] leading-relaxed text-foreground">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        <span>{explainFlight(flight, answers, cheapest, fastest)}</span>
      </p>
    </div>
  );
}

function PackageRow({ pkg, answers }: { pkg: PackageT & { score: number }; answers: QuizAnswers }) {
  const savePct = Math.round((pkg.savings / Math.max(1, pkg.separatePrice)) * 100);
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{pkg.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Stars n={pkg.hotel.stars} />
            <span>· דירוג {pkg.rating}/10</span>
          </div>
        </div>
        <div className="shrink-0 text-left">
          <div className="text-sm font-black text-foreground">{fmtILS(pkg.totalPrice)}</div>
          <div className="text-[10px] text-muted-foreground line-through">{fmtILS(pkg.separatePrice)}</div>
          <div className="mt-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            חיסכון {savePct}%
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {pkg.includes.map((inc) => (
          <span key={inc} className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground">✓ {inc}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          <Plane className="mr-0.5 inline h-3 w-3" />{pkg.flight.airline} · {pkg.flight.stops === 0 ? "ישירה" : `${pkg.flight.stops} עצירות`}
        </span>
        <span className="rounded-full bg-gradient-sunset px-2 py-0.5 text-[10px] font-black text-white">
          התאמה {pkg.score}%
        </span>
      </div>
      <p className="mt-2 flex gap-1 rounded-xl bg-card/70 p-2 text-[11px] leading-relaxed text-foreground">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
        <span>{explainPackage(pkg, answers)}</span>
      </p>
    </div>
  );
}

