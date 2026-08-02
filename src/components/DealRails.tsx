import { Carousel } from "@/components/Carousel";
import { DealCard } from "@/components/DealCard";
import { buildDealRails } from "@/lib/deal-categories";
import { useDestinations } from "@/lib/use-catalog";
import { Info } from "lucide-react";

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
          </div>

          {rail.deals.length === 0 ? (
            <div className="flex items-center gap-3 rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              אין כרגע דילים זמינים בקטגוריה הזו. ברגע שיתקבלו הצעות מהספקים הן יופיעו כאן.
            </div>
          ) : (
            <Carousel ariaLabel={rail.title}>
              {rail.deals.map((deal) => (
                <DealCard key={`${rail.id}-${deal.id}`} deal={deal} />
              ))}
            </Carousel>
          )}
        </section>
      ))}
    </div>
  );
}
