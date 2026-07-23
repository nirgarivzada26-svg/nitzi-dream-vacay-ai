import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NitziLogo } from "@/components/NitziLogo";
import { ArrowLeft, Calendar, Hotel, MapPin, Sparkles, Utensils, Wallet, Wand2 } from "lucide-react";
import { defaultAnswers, pickDestination, tripTypes, styles, type QuizAnswers } from "@/lib/nitzi-data";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "החופשה שלך — NITZI" },
      { name: "description", content: "הצעת חופשה בהתאמה אישית מ-NITZI." },
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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("nitzi:answers");
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const dest = useMemo(() => pickDestination(answers), [answers]);
  const total = answers.budget * answers.people;
  const typeLabel = tripTypes.find((t) => t.id === answers.type)?.label ?? "חופשה";
  const styleLabel = styles.find((s) => s.id === answers.style)?.label ?? "";

  if (loading) return <LoadingState />;

  return (
    <div dir="rtl" className="relative min-h-screen bg-background pb-24">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gradient-sunset opacity-30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 -left-24 h-72 w-72 rounded-full bg-gradient-ocean opacity-25 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-3">
          <button
            onClick={() => navigate({ to: "/quiz" })}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
            aria-label="חזרה לשאלון"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <div className="w-10" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-5 px-5 pt-5">
        {/* Hero card */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-aurora p-6 text-white shadow-glow animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur">
            <Sparkles className="h-3 w-3" /> ההמלצה של NITZI
          </span>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black leading-none">{dest.name}</h1>
              <p className="mt-1 text-sm font-semibold text-white/85">{dest.country} {dest.emoji}</p>
            </div>
            <div className="text-right text-xs font-bold">
              <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
                <div className="text-[10px] text-white/70">התאמה</div>
                <div className="text-lg">97%</div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/95">{dest.tagline}</p>
        </section>

        {/* Why */}
        <Card>
          <SectionTitle icon={<Wand2 className="h-4 w-4" />} title="למה זה מתאים לך" />
          <ul className="mt-3 space-y-2 text-sm text-foreground">
            <Li>בחרת {typeLabel} — {dest.name} מספק/ת בדיוק את זה.</Li>
            {styleLabel && <Li>סגנון {styleLabel} מתאים לאווירה של היעד.</Li>}
            <Li>{answers.days} ימים = טיים־פריים מושלם לחוויה בלי להתעייף.</Li>
            <Li>בניתי לך מסלול לפי תקציב של ₪{answers.budget.toLocaleString()} לאדם.</Li>
          </ul>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Calendar className="h-4 w-4" />} label="ימים" value={String(answers.days)} />
          <Stat icon={<MapPin className="h-4 w-4" />} label="נוסעים" value={String(answers.people)} />
          <Stat icon={<Wallet className="h-4 w-4" />} label="תקציב סה״כ" value={`₪${(total / 1000).toFixed(1)}K`} />
        </div>

        {/* Itinerary */}
        <Card>
          <SectionTitle icon={<Calendar className="h-4 w-4" />} title="המסלול היומי" />
          <ol className="mt-4 space-y-3">
            {dest.itinerary.slice(0, answers.days).map((d, i) => (
              <li key={i} className="relative flex gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-sunset text-sm font-black text-white shadow-glow">
                  {i + 1}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary">יום {i + 1}</p>
                  <p className="text-sm leading-relaxed text-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Hotels */}
        <Card>
          <SectionTitle icon={<Hotel className="h-4 w-4" />} title="מלונות מומלצים" />
          <div className="mt-3 space-y-2">
            {dest.hotels.map((h) => (
              <div key={h.name} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-ocean text-white">
                  <Hotel className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Attractions */}
        <Card>
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="אטרקציות חובה" />
          <div className="mt-3 flex flex-wrap gap-2">
            {dest.attractions.map((a) => (
              <span key={a} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
                ✦ {a}
              </span>
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

        {/* Budget */}
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

        <div className="flex gap-3 pt-2">
          <Link
            to="/quiz"
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-center text-sm font-bold text-foreground"
          >
            שנה תשובות
          </Link>
          <Link
            to="/"
            className="flex-1 rounded-2xl bg-gradient-sunset py-3 text-center text-sm font-bold text-white shadow-glow"
          >
            תכנן עוד חופשה
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  const lines = [
    "אני מנתח את התשובות שלך…",
    "מחפש יעדים שמתאימים לסגנון…",
    "בונה מסלול יומי מותאם…",
    "מוסיף המלצות שף ומלונות…",
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
              className={`flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 transition ${
                idx <= i ? "opacity-100" : "opacity-30"
              }`}
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
    <section className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-soft backdrop-blur animate-fade-up">
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
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-soft">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-gradient-ocean text-white">{icon}</div>
      <div className="mt-2 text-lg font-black text-foreground">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
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
