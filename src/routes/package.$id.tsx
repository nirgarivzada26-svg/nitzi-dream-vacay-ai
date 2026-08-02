import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, CheckCircle2, GitCompare, Hotel as HotelIcon, Plane, Shield, Sparkles, Star } from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { WhyNitziButton } from "@/components/WhyNitziButton";
import { SimilarPicks } from "@/components/SimilarPicks";
import { TripTimeline } from "@/components/TripTimeline";
import { findPackage, getResultsCache } from "@/lib/results-cache";
import { explainPackage } from "@/lib/explain";
import { isCompared, toggleCompare, useCompare } from "@/lib/compare-store";
import { pickDestination } from "@/lib/nitzi-data";

export const Route = createFileRoute("/package/$id")({
  head: () => ({
    meta: [
      { title: "חבילת חופשה — NITZI" },
      { name: "description", content: "חבילת נופש מלאה: טיסות, מלון, מסלול ומחיר מאומת." },
      { property: "og:title", content: "חבילת חופשה — NITZI" },
      { property: "og:description", content: "טיסה + מלון + מסלול יומי במחיר משתלם יותר." },
    ],
  }),
  component: PackageDetailPage,
});

function fmtILS(n: number) { return `₪${Math.round(n).toLocaleString()}`; }
function fmtTime(iso: string) { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

function PackageDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const pkg = findPackage(id);
  const cache = getResultsCache();
  useCompare();

  if (!pkg || !cache) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">החבילה לא נמצאה</h1>
          <button onClick={() => navigate({ to: "/" })} className="mt-4 rounded-2xl bg-gradient-sunset px-5 py-2 text-sm font-black text-white shadow-glow">חזרה לבית</button>
        </div>
      </div>
    );
  }

  const dest = pickDestination(cache.answers);
  const savePct = Math.round((pkg.savings / Math.max(1, pkg.separatePrice)) * 100);
  const inCompare = isCompared(pkg.id, "package");
  const reasons = [
    `חוסך לך כ־${savePct}% לעומת הזמנה נפרדת (${fmtILS(pkg.savings)}).`,
    `${pkg.nights} לילות ב-${pkg.hotel.name} · ${pkg.hotel.stars} כוכבים · דירוג ${pkg.hotel.guestRating.toFixed(1)}/10.`,
    `טיסה עם ${pkg.flight.airline} — ${pkg.flight.stops === 0 ? "ישירה" : `${pkg.flight.stops} עצירות`}, ${Math.round(pkg.flight.durationMinutes / 60)} שעות.`,
    `סה״כ לחבילה: ${fmtILS(pkg.totalPrice)} ל-${cache.answers.people} נוסעים.`,
    `ציון NITZI: ${pkg.score}% — התאמה לתקציב, סגנון ודירוגים.`,
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => navigate({ to: "/result" })} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card" aria-label="חזרה">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <button onClick={() => toggleCompare({ id: pkg.id, kind: "package" })} className={`grid h-11 w-11 place-items-center rounded-full border ${inCompare ? "border-primary bg-primary text-white" : "border-border bg-card"}`} aria-label="השווה">
            <GitCompare className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[2rem] shadow-glow">
              <img src={dest.image} alt={pkg.title} className="h-[340px] w-full object-cover sm:h-[440px] lg:h-[500px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
                <Sparkles className="h-3.5 w-3.5" /> חבילה מומלצת · חיסכון {savePct}%
              </span>
              <div className="absolute bottom-0 inset-x-0 p-5 text-white sm:p-6">
                <p className="text-[11px] font-bold text-white/85">{dest.country} {dest.emoji}</p>
                <h1 className="text-3xl font-black leading-tight drop-shadow-md sm:text-5xl">{pkg.title}</h1>
                <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">{pkg.nights} לילות · {cache.answers.people} נוסעים · דירוג {pkg.rating}/10</p>
              </div>
            </section>

            <Section title="הטיסה" icon={<Plane className="h-4 w-4" />}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-foreground">{pkg.flight.airline}</p>
                  <p className="text-xs text-muted-foreground">טיסה {pkg.flight.flightNumber} · {pkg.flight.stops === 0 ? "ישירה" : `${pkg.flight.stops} עצירות`}</p>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground">{fmtTime(pkg.flight.departAt)} → {fmtTime(pkg.flight.arriveAt)}</div>
                  <div className="text-xs text-muted-foreground">{Math.round(pkg.flight.durationMinutes / 60)} שעות</div>
                </div>
              </div>
            </Section>

            <Section title="המלון" icon={<HotelIcon className="h-4 w-4" />}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-black text-foreground">{pkg.hotel.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Stars n={pkg.hotel.stars} />
                    <span>· {pkg.hotel.stars} כוכבים</span>
                    <span>· דירוג {pkg.hotel.guestRating.toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="מה כלול" icon={<CheckCircle2 className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm">
                {pkg.includes.map((i) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {i}</li>
                ))}
              </ul>
            </Section>

            <Section title="ציר זמן החופשה" icon={<Sparkles className="h-4 w-4" />}>
              <TripTimeline destinationName={dest.name} itinerary={dest.itinerary} restaurants={dest.restaurants} attractions={dest.attractions} />
            </Section>

            <Section title="הסבר NITZI" icon={<Sparkles className="h-4 w-4" />}>
              <p className="text-sm leading-relaxed text-foreground">{explainPackage(pkg, cache.answers)}</p>
              <div className="mt-3"><WhyNitziButton reasons={reasons} score={pkg.score} /></div>
            </Section>

            <SimilarPicks excludeName={dest.name} title="חבילות דומות שאולי תאהב" />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div>
                <div className="text-xs font-bold text-muted-foreground line-through">{fmtILS(pkg.separatePrice)}</div>
                <div className="text-3xl font-black text-foreground">{fmtILS(pkg.totalPrice)}</div>
                <div className="text-xs text-emerald-700 font-bold">חיסכון של {fmtILS(pkg.savings)} ({savePct}%)</div>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
                {pkg.nights} לילות · {cache.answers.people} נוסעים
              </div>
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-5 py-4 text-base font-black text-white shadow-glow">
                <Sparkles className="h-5 w-5" /> הזמן חבילה
              </button>
              <p className="text-center text-[11px] text-muted-foreground"><Shield className="mr-1 inline h-3 w-3" /> ביטול חינם עד 7 ימים · מחיר יאומת לפני חיוב</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-glow backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">מחיר חבילה</div>
            <div className="text-xl font-black text-foreground">{fmtILS(pkg.totalPrice)}</div>
            <div className="text-[10px] text-emerald-700 font-bold">חיסכון {savePct}%</div>
          </div>
          <button className="ms-auto rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow">
            הזמן עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
      <h3 className="flex items-center gap-2 text-base font-black text-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-sunset text-white">{icon}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Stars({ n }: { n: number }) {
  return <span className="inline-flex" aria-label={`${n} כוכבים`}>{Array.from({ length: n }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</span>;
}
