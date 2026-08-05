import type { PriceBreakdown } from "@/lib/deal-pricing";
import { fmtCents } from "@/lib/deal-pricing";

export function DealPriceBreakdown({ b }: { b: PriceBreakdown }) {
  const rows: { label: string; cents: number; negative?: boolean }[] = [
    { label: "טיסות", cents: b.flightsCents },
    { label: "מלון", cents: b.hotelCents },
    { label: "מסים", cents: b.taxesCents },
    { label: "דמי טיפול NITZI", cents: b.feesCents },
  ];
  if (b.extrasCents > 0) rows.push({ label: "תוספות", cents: b.extrasCents });

  return (
    <div className="space-y-2">
      <dl className="space-y-1.5 text-[13px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-black text-foreground">{fmtCents(r.cents)}</dd>
          </div>
        ))}
        {b.discountCents > 0 && (
          <div className="flex items-center justify-between text-emerald-700">
            <dt>הנחת חבילה</dt>
            <dd className="font-black">−{fmtCents(b.discountCents)}</dd>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <dt className="text-sm font-black text-foreground">סה״כ ל-{b.travelers} נוסעים</dt>
          <dd className="text-lg font-black text-foreground">{fmtCents(b.totalCents)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">מחיר לנוסע</dt>
          <dd className="font-black text-foreground">{fmtCents(b.perTravelerCents)}</dd>
        </div>
      </dl>
      <p className="text-[11px] text-muted-foreground">
        כל הסכומים מחושבים באגורות בשרת ומוצגים בשקלים. סכום הרכיבים שווה בדיוק לסה״כ.
      </p>
    </div>
  );
}
