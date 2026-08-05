import { Info } from "lucide-react";
import { NO_TIP_DATA, travelTips } from "@/lib/destination-tips";
import type { Destination } from "@/lib/catalog";

export function TravelTips({ dest }: { dest: Destination }) {
  const cats = travelTips(dest);
  return (
    <div className="space-y-2">
      <ul className="grid gap-2 sm:grid-cols-2">
        {cats.map((c) => (
          <li key={c.key} className="rounded-2xl border border-border bg-background/60 p-3">
            <p className="text-[12px] font-black">{c.label}</p>
            {c.available ? (
              <ul className="mt-1 space-y-0.5">
                {c.items.map((i) => (
                  <li key={i} className="text-[12px] text-muted-foreground">
                    • {i}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-amber-700">{NO_TIP_DATA}</p>
            )}
            <p className="mt-1.5 text-[10px] text-muted-foreground/80">מקור: {c.source}</p>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        כל הטיפים נגזרים מנתוני קטלוג היעדים של NITZI בלבד. קטגוריה ללא נתון מגובה מסומנת ככזו ולא
        מושלמת בהשערות.
      </p>
    </div>
  );
}
