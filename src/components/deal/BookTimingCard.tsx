import { Clock3 } from "lucide-react";
import type { BookTiming } from "@/lib/book-timing";

const STYLE: Record<BookTiming["level"], string> = {
  good: "bg-emerald-50 text-emerald-900 border-emerald-200",
  average: "bg-amber-50 text-amber-900 border-amber-200",
  wait: "bg-rose-50 text-rose-900 border-rose-200",
};

const EMOJI: Record<BookTiming["level"], string> = {
  good: "🟢",
  average: "🟡",
  wait: "🔴",
};

export function BookTimingCard({ timing }: { timing: BookTiming | null }) {
  if (!timing)
    return (
      <p className="rounded-2xl border border-border bg-muted/50 p-3 text-[12px] font-bold text-muted-foreground">
        אין מספיק נתונים מאומתים כדי לקבוע אם זה זמן טוב להזמין. NITZI לא מציגה המלצת תזמון ללא
        בסיס נתונים.
      </p>
    );

  return (
    <div className={`rounded-2xl border p-3 ${STYLE[timing.level]}`}>
      <p className="flex items-center gap-2 text-[13px] font-black">
        <Clock3 className="h-4 w-4" aria-hidden />
        {EMOJI[timing.level]} {timing.label}
      </p>
      <p className="mt-1 text-[12px] font-semibold">{timing.detail}</p>
      <p className="mt-1 text-[10px] opacity-75">{timing.basis}</p>
    </div>
  );
}
