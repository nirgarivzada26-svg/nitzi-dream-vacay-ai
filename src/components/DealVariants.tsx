// Variation selector — shows the other canonical offers for the same
// destination (different dates, board, hotel, flight and price) so the
// homepage can stay clean with one card per destination.

import { Link } from "@tanstack/react-router";
import { Moon, Plane, X } from "lucide-react";
import { boardLabels, type Deal } from "@/lib/deals";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short", timeZone: "UTC" });

export function DealVariants({
  destinationName,
  deals,
  onClose,
}: {
  destinationName: string;
  deals: Deal[];
  onClose: () => void;
}) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`אפשרויות נוספות ל${destinationName}`}
      className="fixed inset-0 z-[130] grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-[2rem] border border-border/60 bg-card p-5 shadow-glow sm:max-w-2xl sm:rounded-[2rem]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-foreground">
              {deals.length} אפשרויות ל{destinationName}
            </h3>
            <p className="text-xs text-muted-foreground">
              אותו יעד — תאריכים, בסיס אירוח, מלון וטיסה שונים. כל אפשרות היא חבילה אחת בקטלוג.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-full border border-border p-2 text-muted-foreground transition hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-col gap-2.5">
          {deals.map((d) => (
            <li key={d.id}>
              <Link
                to="/deal/$id"
                params={{ id: d.id }}
                search={{ flight: undefined }}
                onClick={onClose}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 text-right transition hover:border-primary/50 hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-foreground">{d.hotel.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Moon className="h-3 w-3" /> {d.dates.nights} לילות
                    </span>
                    <span>
                      {fmtDate(d.dates.start)}–{fmtDate(d.dates.end)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Plane className="h-3 w-3" />
                      {d.outbound.stops === 0 ? "ישירה" : `${d.outbound.stops} עצירות`} ·{" "}
                      {d.outbound.airline}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {boardLabels[d.board]}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <div className="text-lg font-black text-foreground">{fmt(d.price.perPerson)}</div>
                  <div className="text-[10px] font-bold text-muted-foreground">לאדם</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
