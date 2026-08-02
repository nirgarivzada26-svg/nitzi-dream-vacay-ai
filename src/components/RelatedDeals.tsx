// Related content rails shown at the bottom of a package page.
// Every rail is a selector over the same catalog-derived deal list, so a
// package never exists twice — each rail references the identical record.

import { useMemo } from "react";
import { Carousel } from "@/components/Carousel";
import { DealCard } from "@/components/DealCard";
import { listDeals, type Deal } from "@/lib/deals";
import type { Destination } from "@/lib/catalog";
import { nitziScore } from "@/lib/deal-insights";
import { useRecentlyViewed } from "@/lib/recently-viewed";

interface Rail {
  id: string;
  title: string;
  emoji: string;
  deals: Deal[];
}

export function RelatedDeals({ deal, catalog }: { deal: Deal; catalog: Destination[] }) {
  const recent = useRecentlyViewed();
  const all = useMemo(() => listDeals(catalog, 3), [catalog]);

  const rails = useMemo<Rail[]>(() => {
    const others = all.filter((d) => d.id !== deal.id);
    const byId = new Map(all.map((d) => [d.id, d]));

    const priceBand = (d: Deal) => Math.abs(d.price.perPerson - deal.price.perPerson);

    return [
      {
        id: "similar",
        title: "חבילות דומות",
        emoji: "🔎",
        deals: [...others]
          .filter((d) => d.destination.slug !== deal.destination.slug)
          .sort((a, b) => priceBand(a) - priceBand(b))
          .slice(0, 10),
      },
      {
        id: "same-hotel",
        title: `עוד באותו מלון — ${deal.hotel.name}`,
        emoji: "🏨",
        deals: others.filter((d) => d.hotel.name === deal.hotel.name).slice(0, 10),
      },
      {
        id: "same-destination",
        title: `עוד חבילות ב${deal.destination.name}`,
        emoji: "📍",
        deals: others.filter((d) => d.destination.slug === deal.destination.slug).slice(0, 10),
      },
      {
        id: "nearby",
        title: "יעדים באזור",
        emoji: "🧭",
        deals: others
          .filter(
            (d) =>
              d.destination.region === deal.destination.region &&
              d.destination.slug !== deal.destination.slug,
          )
          .slice(0, 10),
      },
      {
        id: "ai",
        title: "NITZI ממליץ",
        emoji: "🤖",
        deals: [...others].sort((a, b) => nitziScore(b) - nitziScore(a)).slice(0, 10),
      },
      {
        id: "recent",
        title: "נצפו לאחרונה",
        emoji: "🕘",
        deals: recent
          .filter((id) => id !== deal.id)
          .map((id) => byId.get(id))
          .filter((d): d is Deal => !!d)
          .slice(0, 10),
      },
      {
        id: "trending",
        title: "מבוקשים עכשיו",
        emoji: "📈",
        deals: others.filter((d) => d.destination.isPopular).slice(0, 10),
      },
      {
        id: "bestsellers",
        title: "רבי מכר",
        emoji: "🏆",
        deals: [...others]
          .sort((a, b) => b.hotel.reviewsCount - a.hotel.reviewsCount)
          .slice(0, 10),
      },
    ].filter((r) => r.deals.length > 0);
  }, [all, deal, recent]);

  if (rails.length === 0) return null;

  return (
    <div dir="rtl" className="flex flex-col gap-10">
      {rails.map((rail) => (
        <section key={rail.id}>
          <h3 className="mb-3 flex items-center gap-2 px-1 text-xl font-black text-foreground sm:text-2xl">
            <span aria-hidden>{rail.emoji}</span>
            {rail.title}
          </h3>
          <Carousel ariaLabel={rail.title}>
            {rail.deals.map((d) => (
              <DealCard key={`${rail.id}-${d.id}`} deal={d} />
            ))}
          </Carousel>
        </section>
      ))}
    </div>
  );
}
