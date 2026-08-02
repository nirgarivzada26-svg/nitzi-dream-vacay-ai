import { smartPrice } from "@/lib/smart-price";
import type { Deal } from "@/lib/deals";

/** Compact chip for cards; `full` adds the explanation line for detail pages. */
export function SmartPriceBadge({ deal, full = false }: { deal: Deal; full?: boolean }) {
  const v = smartPrice(deal);
  if (!v) return null;

  if (!full) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${v.cls}`}
      >
        {v.emoji} {v.label}
        {v.level !== "normal" && <span className="font-bold">· {Math.abs(v.deltaPct)}%</span>}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl p-3 text-right ${v.cls}`}>
      <div className="text-sm font-black">
        {v.emoji} {v.label}
      </div>
      <p className="mt-0.5 text-[12px] font-semibold opacity-90">{v.detail}</p>
      <p className="mt-1 text-[10px] opacity-70">
        ההשוואה מבוססת על מחיר ממוצע לאדם ליעד במאגר של NITZI.
      </p>
    </div>
  );
}
