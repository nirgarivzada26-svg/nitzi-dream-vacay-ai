import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Info, SlidersHorizontal, Star, Waves } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { CardGridSkeleton } from "@/components/CardGridSkeleton";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { groupDeals, type Deal } from "@/lib/deals";
import { getPackagesOffers } from "@/lib/packages-offers.functions";

type SortKey = "value" | "price" | "discount" | "soon";

interface PackagesSearch {
  country?: string;
  region?: string;
  board?: "all-inclusive";
  stars?: number;
  beach?: boolean;
  direct?: boolean;
  sort?: SortKey;
}

const SORTS: SortKey[] = ["value", "price", "discount", "soon"];

export const packagesOffersQueryOptions = queryOptions({
  queryKey: ["packages-offers"],
  queryFn: () => getPackagesOffers(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "חבילות נופש — כל הדילים של NITZI" },
      {
        name: "description",
        content:
          "כל חבילות הנופש במקום אחד: טיסה + מלון, סינון לפי מחיר, מדינה, כוכבים, הכל כלול וקרבה לים.",
      },
      { property: "og:title", content: "כל החבילות — NITZI" },
      {
        property: "og:description",
        content: "טיסה, מלון ומחיר מאומת. סננו לפי תקציב, מדינה ודירוג ומצאו את החופשה שלכם.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (raw: Record<string, unknown>): PackagesSearch => ({
    country: typeof raw.country === "string" ? raw.country : undefined,
    region: typeof raw.region === "string" ? raw.region : undefined,
    board: raw.board === "all-inclusive" ? "all-inclusive" : undefined,
    stars: Number(raw.stars) > 0 ? Number(raw.stars) : undefined,
    beach: raw.beach === true || raw.beach === "true" ? true : undefined,
    direct: raw.direct === true || raw.direct === "true" ? true : undefined,
    sort: SORTS.includes(raw.sort as SortKey) ? (raw.sort as SortKey) : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(packagesOffersQueryOptions),
  pendingComponent: CardGridSkeleton,
  component: PackagesPage,
});

const hasPool = (note: string) => /בריכ|pool/i.test(note);

const valueScore = (d: Deal) => d.hotel.guestRating * 100 - d.price.perPerson / 50;

function PackagesPage() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(packagesOffersQueryOptions);
  const { deals: all, sourceMode, emptyReason: sourceEmptyReason } = data;

  const [maxPrice, setMaxPrice] = useState(15000);
  const [country, setCountry] = useState(search.country ?? "all");
  const [minStars, setMinStars] = useState(search.stars ?? 0);
  const [pool, setPool] = useState(false);
  const [allInclusive, setAllInclusive] = useState(search.board === "all-inclusive");
  const [nearBeach, setNearBeach] = useState(Boolean(search.beach));
  const [directOnly, setDirectOnly] = useState(Boolean(search.direct));

  const countries = useMemo(
    () => Array.from(new Set(all.map((d) => d.destination.country))).sort(),
    [all],
  );

  const filtered = all.filter((d) => {
    if (d.price.perPerson > maxPrice) return false;
    if (search.region && d.destination.region !== search.region) return false;
    if (directOnly && (d.outbound.stops > 0 || d.inbound.stops > 0)) return false;
    if (country !== "all" && d.destination.country !== country) return false;
    if (minStars && d.hotel.stars < minStars) return false;
    if (pool && !hasPool(d.hotel.note)) return false;
    if (allInclusive && d.board !== "all-inclusive") return false;
    if (nearBeach && !d.destination.matches.includes("beach")) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (search.sort) {
      case "price":
        return a.price.perPerson - b.price.perPerson;
      case "discount":
        return b.discountPct - a.discountPct;
      case "soon":
        return +new Date(a.dates.start) - +new Date(b.dates.start);
      default:
        return valueScore(b) - valueScore(a);
    }
  });

  // One canonical card per destination; the rest are offered as variations.
  const groups = groupDeals(sorted);

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
                type="range"
                min={1000}
                max={20000}
                step={250}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <label className="block rounded-2xl border border-border/60 bg-muted/40 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                מדינה
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full bg-transparent text-base font-bold text-foreground outline-none"
              >
                <option value="all">כל המדינות</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                כוכבים
              </span>
              <div className="mt-2 flex gap-2">
                {[0, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinStars(s)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      minStars === s
                        ? "bg-gradient-sunset text-white shadow-glow"
                        : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {s === 0 ? (
                      "הכל"
                    ) : (
                      <>
                        {s}
                        <Star className="h-3 w-3" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Toggle on={pool} onClick={() => setPool(!pool)} label="🏊 בריכה" />
            <Toggle
              on={allInclusive}
              onClick={() => setAllInclusive(!allInclusive)}
              label="🍹 הכל כלול"
            />
            <Toggle
              on={nearBeach}
              onClick={() => setNearBeach(!nearBeach)}
              label="🌊 קרוב לים"
              icon={<Waves className="h-3 w-3" />}
            />
            <Toggle
              on={directOnly}
              onClick={() => setDirectOnly(!directOnly)}
              label="🛫 טיסה ישירה"
            />
          </div>
        </section>

        {sourceMode !== "demo" ? (
          <div className="mt-6 flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            {sourceEmptyReason ?? "תצוגת החבילות עבור מצב זה עדיין לא זמינה"}
          </div>
        ) : (
          <>
            {(allInclusive || pool) && (
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-[12px] font-bold text-amber-900">
                <Info className="h-3.5 w-3.5 shrink-0" />
                הפילטרים "הכל כלול" ו"בריכה" זמינים כרגע רק במצב הדגמה — לא ניתן לסנן לפיהם מול
                ספקים אמיתיים עדיין.
              </div>
            )}

            <p className="mt-6 text-sm font-bold text-muted-foreground">
              {groups.length} יעדים · {filtered.length} חבילות תואמות
            </p>

            {groups.length === 0 ? (
              <div className="mt-4 flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                אין חבילות שתואמות את הסינון הזה. נסו להרחיב את התקציב או להסיר פילטר.
              </div>
            ) : (
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groups.map((group) => (
                  <DealCard key={group.key} deal={group.main} variants={group.variants} fluid />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
  icon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition ${
        on
          ? "bg-gradient-sunset text-white shadow-glow"
          : "border border-border bg-card text-muted-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}
