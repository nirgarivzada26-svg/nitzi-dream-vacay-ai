import { Plane, PlaneLanding, Hotel, MapPin, Utensils, Waves, PlaneTakeoff } from "lucide-react";

interface Props {
  originCity?: string;
  destinationName: string;
  itinerary: string[]; // day-by-day
  restaurants?: string[];
  attractions?: string[];
}

export function TripTimeline({ originCity = "תל אביב", destinationName, itinerary, restaurants = [], attractions = [] }: Props) {
  const steps: { icon: React.ReactNode; title: string; desc: string; tone: string }[] = [
    { icon: <PlaneTakeoff className="h-5 w-5" />, title: "יציאה מישראל", desc: `המראה מנתב״ג ל${destinationName}`, tone: "from-sky-500 to-blue-600" },
    { icon: <PlaneLanding className="h-5 w-5" />, title: "נחיתה", desc: `הגעה ל${destinationName} — העברות ליעד`, tone: "from-emerald-500 to-teal-600" },
    { icon: <Hotel className="h-5 w-5" />, title: "צ'ק-אין למלון", desc: "מנוחה קצרה ופתיחה של החופשה", tone: "from-amber-500 to-orange-600" },
    ...itinerary.slice(0, 4).map((d, i) => ({
      icon: i % 2 === 0 ? <MapPin className="h-5 w-5" /> : <Waves className="h-5 w-5" />,
      title: `יום ${i + 1}`,
      desc: d,
      tone: "from-primary to-coral",
    })),
    ...(restaurants[0] ? [{ icon: <Utensils className="h-5 w-5" />, title: "ארוחת ערב מומלצת", desc: restaurants[0], tone: "from-rose-500 to-pink-600" }] : []),
    ...(attractions[0] ? [{ icon: <MapPin className="h-5 w-5" />, title: "אטרקציית שיא", desc: attractions[0], tone: "from-violet-500 to-fuchsia-600" }] : []),
    { icon: <Plane className="h-5 w-5" />, title: "טיסת חזור", desc: `חזרה ל${originCity} — סוף החופשה`, tone: "from-slate-500 to-slate-700" },
  ];

  return (
    <div className="relative">
      <div className="absolute right-[22px] top-0 h-full w-0.5 bg-gradient-to-b from-primary/40 via-border to-primary/40" aria-hidden />
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-4">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-glow`}>
              {s.icon}
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-card p-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">שלב {i + 1}</p>
              <p className="text-sm font-black text-foreground">{s.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
