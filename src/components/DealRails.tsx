import { Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { Carousel } from "@/components/Carousel";
import { DealCard } from "@/components/DealCard";
import { buildDealRails, type RailFilters } from "@/lib/deal-categories";
import { useDestinations } from "@/lib/use-catalog";

/** Rail filters -> /packages search params, so "לכל החבילות" keeps the slice. */
function toSearch(f: RailFilters) {
  return {
    ...(f.country ? { country: f.country } : {}),
    ...(f.region ? { region: f.region } : {}),
    ...(f.board ? { board: f.board } : {}),
    ...(f.stars ? { stars: f.stars } : {}),
    ...(f.beach ? { beach: true } : {}),
    ...(f.direct ? { direct: true } : {}),
    ...(f.sort ? { sort: f.sort } : {}),
  };
}

export function DealRails() {
  const rails = buildDealRails(useDestinations());

  return (
    <div className="flex flex-col gap-14">
      {rails.map((rail) => (
        <section key={rail.id} className="animate-fade-up">
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-2xl font-black text-foreground sm:text-3xl">
                <span aria-hidden>{rail.emoji}</span>
                {rail.title}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{rail.subtitle}</p>
            </div>
            <Link
              to="/packages"
              search={toSearch(rail.filters)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-black text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              לכל החבילות <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          {rail.groups.length === 0 ? (
            <div className="flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              אין כרגע דילים זמינים בקטגוריה הזו. ברגע שיתקבלו הצעות מהספקים הן יופיעו כאן.
            </div>
          ) : (
            <Carousel ariaLabel={rail.title}>
              {rail.groups.map((group) => (
                <DealCard
                  key={`${rail.id}-${group.key}`}
                  deal={group.main}
                  variants={group.variants}
                />
              ))}
            </Carousel>
          )}
        </section>
      ))}
    </div>
  );
}
