import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock, Moon, Plane, Star } from "lucide-react";
import { boardLabels, type Deal } from "@/lib/deals";
import { DestinationImage } from "@/components/DestinationImage";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short" });

export function DealCard({ deal }: { deal: Deal }) {
  const d = deal;
  return (
    <Link
      to="/deal/$id"
      params={{ id: d.id }}
      draggable={false}
      className="group relative w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl border border-border/60 bg-card text-right shadow-soft transition hover:shadow-glow active:scale-[0.99] sm:w-[320px] lg:w-[360px]"
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
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {d.hotel.stars}★ · {d.hotel.guestRating}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{boardLabels[d.board]}</span>
          {d.freeCancellation && (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">ביטול חינם</span>
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
            <Plane className="h-3 w-3" /> {d.outbound.stops === 0 ? "ישירה" : `${d.outbound.stops} עצירות`}
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
  );
}
