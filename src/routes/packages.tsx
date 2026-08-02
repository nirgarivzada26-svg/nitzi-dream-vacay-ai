import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Info, SlidersHorizontal, Star, Waves } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { listDeals } from "@/lib/deals";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "חבילות נופש — כל הדילים של NITZI" },
      { name: "description", content: "כל חבילות הנופש במקום אחד: טיסה + מלון, סינון לפי מחיר, מדינה, כוכבים, הכל כלול וקרבה לים." },
      { property: "og:title", content: "כל החבילות — NITZI" },
      { property: "og:description", content: "טיסה, מלון ומחיר מאומת. סננו לפי תקציב, מדינה ודירוג ומצאו את החופשה שלכם." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: PackagesPage,
});

const hasPool = (note: string) => /בריכ|pool/i.test(note);

function PackagesPage() {
  const catalog = useDestinations();
  const all = useMemo(() => listDeals(catalog, 3), [catalog]);

  const [maxPrice, setMaxPrice] = useState(15000);
  const [country, setCountry] = useState("all");
  const [minStars, setMinStars] = useState(0);
  const [pool, setPool] = useState(false);
  const [allInclusive, setAllInclusive] = useState(false);
  const [nearBeach, setNearBeach] = useState(false);

  const countries = useMemo(
    () => Array.from(new Set(all.map((d) => d.destination.country))).sort(),
    [all],
  );

  const filtered = all.filter((d) => {
    if (d.price.perPerson > maxPrice) return false;
    if (country !== "all" && d.destination.country !== country) return false;
    if (minStars && d.hotel.stars < minStars) return false;
    if (pool && !hasPool(d.hotel.note)) return false;
    if (allInclusive && d.board !== "all-inclusive") return false;
    if (nearBeach && !d.destination.matches.includes("beach")) return false;
    return true;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-20 pt-8 sm:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-black text-foreground sm:text-5xl">כל החבילות 🏖️</h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            טיסה + מלון במחיר אחד. סננו לפי מה שחשוב לכם — ולחצו על כל דיל לפרטים המלאים.
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-border/60 bg-card p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2 text-sm font-black text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> פילטרים
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>מחיר מקסימלי לאדם</span>
                <span className="text-gradient-sunset text-sm">₪{maxPrice.toLocaleString()}</span>
              </div>
              <input
                type="range" min={1000} max={20000} step={250}
                value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <label className="block rounded-2xl border border-border/60 bg-muted/40 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">מדינה</span>
              <select
                value={country} onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full bg-transparent text-base font-bold text-foreground outline-none"
              >
                <option value="all">כל המדינות</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">כוכבים</span>
              <div className="mt-2 flex gap-2">
                {[0, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinStars(s)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      minStars === s ? "bg-gradient-sunset text-white shadow-glow" : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {s === 0 ? "הכל" : <>{s}<Star className="h-3 w-3" /></>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Toggle on={pool} onClick={() => setPool(!pool)} label="🏊 בריכה" />
            <Toggle on={allInclusive} onClick={() => setAllInclusive(!allInclusive)} label="🍹 הכל כלול" />
            <Toggle on={nearBeach} onClick={() => setNearBeach(!nearBeach)} label="🌊 קרוב לים" icon={<Waves className="h-3 w-3" />} />
          </div>
        </section>

        <p className="mt-6 text-sm font-bold text-muted-foreground">{filtered.length} חבילות תואמות</p>

        {filtered.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            אין חבילות שתואמות את הסינון הזה. נסו להרחיב את התקציב או להסיר פילטר.
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((deal) => (
              <DealCard key={deal.id} deal={deal} fluid />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition ${
        on ? "bg-gradient-sunset text-white shadow-glow" : "border border-border bg-card text-muted-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}
