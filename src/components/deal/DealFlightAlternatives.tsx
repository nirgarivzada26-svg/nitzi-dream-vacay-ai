import { useRef } from "react";
import { Check, Plane } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { flightAlternatives, type FlightAlternative } from "@/lib/deal-alternatives";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function DealFlightAlternatives({
  deal,
  selectedId,
  onSelect,
}: {
  deal: Deal;
  selectedId: string;
  onSelect: (alt: FlightAlternative) => void;
}) {
  const list = flightAlternatives(deal);
  const liveRef = useRef<HTMLParagraphElement>(null);
  if (list.length < 2) return null;

  return (
    <div className="space-y-3">
      <p ref={liveRef} className="sr-only" role="status" aria-live="polite">
        אפשרות הטיסה שנבחרה: {list.find((a) => a.id === selectedId)?.labels.join(", ")}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((a) => {
          const selected = a.id === selectedId;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                aria-pressed={selected}
                className={`w-full rounded-2xl border p-3 text-right transition ${
                  selected
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border bg-background/60 hover:border-primary/50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {a.labels.map((l) => (
                    <span
                      key={l}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black text-foreground"
                    >
                      {l}
                    </span>
                  ))}
                  {selected && (
                    <span className="ms-auto inline-flex items-center gap-1 text-[11px] font-black text-primary">
                      <Check className="h-3.5 w-3.5" aria-hidden /> נבחר
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] font-bold text-foreground">
                  <Plane className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {a.outbound.airline} · {time(a.outbound.departAt)} →{" "}
                  {time(a.outbound.arriveAt)}
                  <span className="text-muted-foreground">
                    {a.outbound.stops === 0 ? "ישירה" : `${a.outbound.stops} עצירות`}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.checkedBagIncluded ? `מזוודה ${a.checkedBagKg} ק״ג כלולה` : "ללא מזוודה"} ·{" "}
                  {a.fareType}
                </div>
                <div className="mt-1 text-[12px] font-black">
                  {a.priceDeltaPerPerson === 0
                    ? "ללא שינוי במחיר"
                    : `${a.priceDeltaPerPerson > 0 ? "+" : "−"}₪${Math.abs(a.priceDeltaPerPerson).toLocaleString("he-IL")} לאדם`}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
