import { useNavigate } from "@tanstack/react-router";
import { destinations, type Category } from "@/lib/nitzi-data";
import { ArrowLeft, Sparkles } from "lucide-react";

export function DestinationCarousel({ category }: { category: Category }) {
  const navigate = useNavigate();
  const items = category.destinations
    .map((n) => destinations.find((d) => d.name === n))
    .filter((d): d is (typeof destinations)[number] => Boolean(d));

  const isAi = category.id === "ai";

  const open = (name: string) => {
    try {
      sessionStorage.setItem(
        "nitzi:answers",
        JSON.stringify({ type: null, destination: name, days: 5, budget: 5000, people: 2, style: null }),
      );
    } catch {}
    navigate({ to: "/result" });
  };

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-foreground">
            {isAi && <Sparkles className="h-4 w-4 text-primary" />}
            {category.title}
          </h3>
          <p className="text-xs text-muted-foreground">{category.subtitle}</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-primary">
          הכל <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
        </button>
      </div>
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((d) => (
          <button
            key={d.name}
            onClick={() => open(d.name)}
            className="group relative w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl border border-border/60 bg-card text-right shadow-soft transition active:scale-[0.98]"
          >
            <div className="relative h-[280px] w-full overflow-hidden">
              <img
                src={d.image}
                alt={d.name}
                loading="lazy"
                width={800}
                height={1000}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {isAi && (
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/25 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                  <Sparkles className="h-3 w-3" /> AI Pick
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[11px] font-semibold text-white/80">{d.country} {d.emoji}</p>
                <h4 className="text-xl font-black leading-tight">{d.name}</h4>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/85">{d.tagline}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">{d.weather}</span>
                  <span>מ־₪{d.avgBudgetPerPerson.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
