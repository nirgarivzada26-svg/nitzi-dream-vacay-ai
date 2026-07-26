import { Info } from "lucide-react";

/**
 * User-facing honesty banner. NITZI does not currently have live provider
 * integrations — everything below is marked as a preview so we never mislead
 * users about real flights, hotels, or prices.
 */
export function DemoDataNotice({ className = "" }: { className?: string }) {
  return (
    <div
      dir="rtl"
      className={`flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-50/80 p-3 text-right text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 ${className}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400/25">
        <Info className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="text-sm font-black">תצוגה מקדימה · אין ספקי נתונים חיים</p>
        <p className="mt-0.5 text-[11px] opacity-90">
          NITZI עדיין לא מחוברת לספקי טיסות ומלונות אמיתיים. ההצעות שמוצגות כאן הן דוגמאות עיצוב בלבד — לא ניתן להזמין ולא מדובר במחירים אמיתיים. ברגע שנחבר את הספקים, יופיעו כאן רק דילים מאומתים.
        </p>
      </div>
    </div>
  );
}
