import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { buildItinerary, itineraryHasContent, NO_ITINERARY_DATA } from "@/lib/concierge/itinerary";

export function ConciergeItinerary({ deal }: { deal: Deal }) {
  const days = buildItinerary(deal);
  const [open, setOpen] = useState<number>(1);
  const enriched = itineraryHasContent(days);

  return (
    <div className="space-y-2">
      {!enriched && (
        <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
          {NO_ITINERARY_DATA} המסלול שלהלן מבוסס על שעות הטיסה, המלון ובסיס האירוח בלבד.
        </p>
      )}
      {days.map((d) => {
        const isOpen = open === d.day;
        return (
          <div key={d.day} className="overflow-hidden rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : d.day)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                  {d.day}
                </span>
                <span className="text-sm font-black text-foreground">{d.label}</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <CalendarDays className="h-3 w-3" /> {d.date ?? "תאריך לא זמין"}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <ol className="space-y-3 border-t border-border px-4 py-3">
                {d.slots.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-12 shrink-0 pt-0.5 text-[11px] font-black text-primary">
                      {s.time ?? "—"}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">{s.title}</span>
                      {s.detail && (
                        <span className="block text-xs text-muted-foreground">{s.detail}</span>
                      )}
                      <span className="block text-[10px] text-muted-foreground/70">מקור: {s.source}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
