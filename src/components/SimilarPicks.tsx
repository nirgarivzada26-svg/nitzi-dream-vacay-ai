import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { destinations } from "@/lib/nitzi-data";

interface Props {
  excludeName: string;
  title?: string;
}

export function SimilarPicks({ excludeName, title = "אולי תאהב גם..." }: Props) {
  const picks = destinations.filter((d) => d.name !== excludeName).slice(0, 4);
  return (
    <section className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-soft" dir="rtl">
      <h3 className="flex items-center gap-2 text-base font-black text-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-sunset text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        {title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">בחירות מותאמות אישית של NITZI על סמך היעד שבו אתה מתעניין</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {picks.map((d) => (
          <Link
            key={d.name}
            to="/result"
            onClick={() => {
              try { sessionStorage.setItem("nitzi:answers", JSON.stringify({ type: null, destination: d.name, days: 5, budget: d.avgBudgetPerPerson, people: 2, style: null })); } catch {}
            }}
            className="group relative block h-40 overflow-hidden rounded-2xl transition active:scale-[0.97]"
          >
            <img src={d.image} alt={d.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="text-[10px] font-bold text-white/85">{d.country} {d.emoji}</p>
              <p className="text-sm font-black leading-tight">{d.name}</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/90">מ־₪{d.avgBudgetPerPerson.toLocaleString()}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
