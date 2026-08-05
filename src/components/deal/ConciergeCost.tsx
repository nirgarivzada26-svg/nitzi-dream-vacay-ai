import { Wallet } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { tripCost, NOT_ENOUGH_DATA } from "@/lib/concierge/trip-cost";

export function ConciergeCost({ deal }: { deal: Deal }) {
  const cost = tripCost(deal);

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {cost.lines.map((l) => (
          <li key={l.key} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">{l.label}</span>
              <span className="block text-[10px] text-muted-foreground/80">{l.source}</span>
            </span>
            <span
              className={`shrink-0 text-sm font-black ${
                l.cents === null ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {l.cents === null ? NOT_ENOUGH_DATA : cost.format(l.cents)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-black text-foreground">
          <Wallet className="h-4 w-4 text-primary" /> הערכת עלות כוללת ל-{cost.travelers} נוסעים
        </span>
        <span className="text-lg font-black text-primary">
          {cost.totalCents === null ? NOT_ENOUGH_DATA : cost.format(cost.totalCents)}
        </span>
      </div>

      {cost.missing.length > 0 && (
        <p className="text-[11px] font-semibold text-muted-foreground">
          לא מוצגת הערכה נפרדת עבור: {cost.missing.join(", ")} — אין לנו נתון מאומת לפילוח הזה.
        </p>
      )}
    </div>
  );
}
