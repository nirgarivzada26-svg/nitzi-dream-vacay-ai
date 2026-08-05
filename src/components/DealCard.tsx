import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Moon, Plane, Star } from "lucide-react";
import { boardLabels, type Deal } from "@/lib/deals";
import { DestinationImage } from "@/components/DestinationImage";
import { SmartPriceBadge } from "@/components/SmartPriceBadge";
import { DealCardActions } from "@/components/DealCardActions";
import { DealVariants } from "@/components/DealVariants";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short", timeZone: "UTC" });

export function DealCard({
  deal,
  fluid = false,
  variants = [],
}: {
  deal: Deal;
  fluid?: boolean;
  /** Other canonical offers for the same destination. */
  variants?: Deal[];
}) {
  const d = deal;
  const [variantsOpen, setVariantsOpen] = useState(false);
  return (
    <div
      className={`group relative ${
        fluid ? "w-full" : "w-[280px] shrink-0 snap-start sm:w-[320px] lg:w-[360px]"
      }`}
    >
      <DealCardActions deal={d} />
      <Link
        to="/deal/$id"
        params={{ id: d.id }}
        search={{ flight: undefined }}
        draggable={false}
        className="block overflow-hidden rounded-3xl border border-border/60 bg-card text-right shadow-soft transition hover:shadow-glow active:scale-[0.99]"
      >
      <div className="relative h-[220px] w-full overflow-hidden sm:h-[240px]">

        <DestinationImage
          destination={d.destination}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        {d.discountPct > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-gradient-sunset px-2.5 py-1 text-[11px] font-black text-white shadow-glow">
            -{d.discountPct}%
          </span>
        )}
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-foreground backdrop-blur">
          <BadgeCheck className="h-3 w-3 text-emerald-600" /> מחיר אומת
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[11px] font-bold text-white/85">
            {d.destination.country} {d.destination.emoji}
          </p>
          <h4 className="text-xl font-black leading-tight">{d.destination.name}</h4>
        </div>
      </div>

      <div className="space-y-2.5 p-4">
        <p className="line-clamp-1 text-sm font-black text-foreground">{d.hotel.name}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          <SmartPriceBadge deal={d} />

          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {d.hotel.stars}★ ·{" "}
            {d.hotel.guestRating}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
            {boardLabels[d.board]}
          </span>
          {d.freeCancellation && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
              ביטול חינם
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3" /> {d.dates.nights} לילות
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fmtDate(d.dates.start)}–{fmtDate(d.dates.end)}
          </span>
          <span className="flex items-center gap-1">
            <Plane className="h-3 w-3" />{" "}
            {d.outbound.stops === 0 ? "ישירה" : `${d.outbound.stops} עצירות`}
          </span>
        </div>

        <div className="flex items-end justify-between border-t border-border/60 pt-2.5">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground">
              {d.price.availability === "limited" ? "נותרו מקומות אחרונים" : "כולל טיסות והעברות"}
            </div>
            <div className="text-[10px] text-muted-foreground">סה״כ {fmt(d.price.total)} לזוג</div>
          </div>
          <div className="text-left">
            {d.discountPct > 0 && (
              <div className="text-[11px] font-bold text-muted-foreground line-through">
                {fmt(d.listPricePerPerson)}
              </div>
            )}
            <div className="text-xl font-black text-foreground">{fmt(d.price.perPerson)}</div>
            <div className="text-[10px] font-bold text-muted-foreground">לאדם</div>
          </div>
        </div>
      </div>
      </Link>

      {variants.length > 0 && (
        <button
          type="button"
          onClick={() => setVariantsOpen(true)}
          className="mt-2 w-full rounded-2xl border border-dashed border-border bg-muted/40 px-3 py-2 text-[11px] font-black text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          עוד {variants.length} אפשרויות ליעד הזה
        </button>
      )}

      {variantsOpen && (
        <DealVariants
          destinationName={d.destination.name}
          deals={[d, ...variants]}
          onClose={() => setVariantsOpen(false)}
        />
      )}
    </div>

  );
}
