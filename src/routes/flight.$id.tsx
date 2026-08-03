import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Clock,
  Luggage,
  Plane,
  Shield,
  Sparkles,
  Utensils,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { WhyNitziButton } from "@/components/WhyNitziButton";
import { findFlight, getResultsCache } from "@/lib/results-cache";
import { explainFlight } from "@/lib/explain";
import { fareDetails } from "@/lib/flight-details";


export const Route = createFileRoute("/flight/$id")({
  head: () => ({
    meta: [
      { title: "פרטי טיסה — NITZI" },
      { name: "description", content: "פרטי טיסה מלאים: חברת תעופה, זמנים, עצירות ומחיר מאומת." },
      { property: "og:title", content: "פרטי טיסה — NITZI" },
      { property: "og:description", content: "כל מה שצריך לדעת על הטיסה לפני שמזמינים." },
    ],
  }),
  component: FlightDetailPage,
});

function fmtILS(n: number) {
  return `₪${Math.round(n).toLocaleString()}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
function fmtDur(min: number) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${h}ש׳ ${m ? `${m}ד׳` : ""}`.trim();
}

function FlightDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const flight = findFlight(id);
  const cache = getResultsCache();

  if (!flight || !cache) {
    return (
      <div
        dir="rtl"
        className="grid min-h-screen place-items-center bg-background px-6 text-center"
      >
        <div>
          <h1 className="text-2xl font-black">הטיסה לא נמצאה</h1>
          <p className="mt-2 text-sm text-muted-foreground">חזור לעמוד התוצאות.</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 rounded-2xl bg-gradient-sunset px-5 py-2 text-sm font-black text-white shadow-glow"
          >
            חזרה לבית
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = flight.price * Math.max(1, cache.answers.people);
  const reasons = [
    flight.stops === 0 ? "טיסה ישירה — ללא עצירות." : `${flight.stops} עצירות בדרך.`,
    `משך טיסה כולל: ${fmtDur(flight.durationMinutes)}.`,
    `מחיר לאדם: ${fmtILS(flight.price)} · סה״כ ל-${cache.answers.people} נוסעים: ${fmtILS(totalPrice)}.`,
    `חברת תעופה: ${flight.airline}. שעת המראה: ${fmtTime(flight.departAt)}.`,
    `ציון NITZI: ${flight.score}% — משוקלל לפי מחיר, עצירות, משך וזמני המראה.`,
  ];

  const fare = fareDetails(flight);
  const destinationSlug = cache.answers.destination;

  return (

    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate({ to: "/result" })}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
            aria-label="חזרה"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <span className="w-11" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 pt-5 sm:px-6">
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1 text-[11px] font-black text-white shadow-glow">
                <Sparkles className="h-3 w-3" /> ציון NITZI {flight.score}%
              </span>
              <h1 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                {flight.airline}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                טיסה {flight.flightNumber} · {fmtDate(flight.departAt)}
              </p>
            </div>
            <div className="text-left">
              <div className="text-3xl font-black text-foreground">{fmtILS(flight.price)}</div>
              <div className="text-xs text-muted-foreground">לאדם</div>
              <div className="mt-1 text-sm font-bold text-primary">סה״כ {fmtILS(totalPrice)}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl bg-muted/40 p-5">
            <div className="text-center">
              <div className="text-3xl font-black text-foreground">{fmtTime(flight.departAt)}</div>
              <div className="text-xs font-bold text-muted-foreground">{flight.origin}</div>
              <div className="text-[10px] text-muted-foreground">{fmtDate(flight.departAt)}</div>
            </div>
            <div className="flex flex-col items-center">
              <Plane className="h-6 w-6 text-primary" />
              <div className="mt-1 text-[11px] font-bold text-muted-foreground">
                {fmtDur(flight.durationMinutes)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {flight.stops === 0 ? "ישירה" : `${flight.stops} עצירות`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-foreground">{fmtTime(flight.arriveAt)}</div>
              <div className="text-xs font-bold text-muted-foreground">{flight.destination}</div>
              <div className="text-[10px] text-muted-foreground">{fmtDate(flight.arriveAt)}</div>
            </div>
          </div>

          <p className="mt-4 flex gap-2 rounded-2xl bg-primary/5 p-3 text-sm text-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {explainFlight(flight, cache.answers)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              <BadgeCheck className="h-3 w-3" /> מחיר מאומת
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-800">
              <Clock className="h-3 w-3" /> {fmtDur(flight.durationMinutes)}
            </span>
            <WhyNitziButton reasons={reasons} score={flight.score} />
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-5 text-lg font-black text-white shadow-glow">
            <Plane className="h-5 w-5" /> הזמן עכשיו
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            <Shield className="mr-1 inline h-3 w-3" /> ביטול בכפוף למדיניות חברת התעופה
          </p>
        </section>
      </div>
    </div>
  );
}
