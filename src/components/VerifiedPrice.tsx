import { ShieldCheck, TriangleAlert } from "lucide-react";
import {
  REFRESH_TO_VERIFY_LABEL,
  UNAVAILABLE_PRICE_LABEL,
  canRenderPrice,
  isQuoteFresh,
  type VerifiedQuote,
} from "@/lib/providers/verification";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;

function since(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return `לפני ${s} שניות`;
  const m = Math.round(s / 60);
  return m < 90 ? `לפני ${m} דקות` : `לפני ${Math.round(m / 60)} שעות`;
}

/**
 * Renders a price ONLY when the provider verified it.
 * Otherwise shows the explicit unavailable / refresh fallback.
 */
export function VerifiedPrice({
  quote,
  onRefresh,
  className = "",
}: {
  quote: VerifiedQuote | null | undefined;
  onRefresh?: () => void;
  className?: string;
}) {
  if (!canRenderPrice(quote)) {
    return (
      <div className={`space-y-1 text-right ${className}`}>
        <p className="flex items-center justify-end gap-1.5 text-sm font-black text-muted-foreground">
          <TriangleAlert className="h-4 w-4" /> {UNAVAILABLE_PRICE_LABEL}
        </p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[11px] font-bold text-primary underline underline-offset-2"
          >
            {REFRESH_TO_VERIFY_LABEL}
          </button>
        ) : (
          <p className="text-[11px] font-semibold text-muted-foreground">{quote?.reason ?? REFRESH_TO_VERIFY_LABEL}</p>
        )}
      </div>
    );
  }

  const stale = !isQuoteFresh(quote);

  return (
    <div className={`space-y-1 text-right ${className}`}>
      <p className="text-[11px] font-bold text-muted-foreground">החל מ־</p>
      <p className="text-2xl font-black leading-none">{fmt(quote.perPerson as number)}</p>
      {quote.total !== null && (
        <p className="text-[11px] font-semibold text-muted-foreground">לאדם · סה״כ {fmt(quote.total)}</p>
      )}
      {stale ? (
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-700 underline underline-offset-2"
        >
          <TriangleAlert className="h-3 w-3" /> {REFRESH_TO_VERIFY_LABEL}
        </button>
      ) : (
        <p className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-700">
          <ShieldCheck className="h-3 w-3" /> מחיר אומת {since(quote.verifiedAt as string)}
        </p>
      )}
    </div>
  );
}

/** Provider-confirmed scarcity only. Renders nothing when unconfirmed. */
export function AvailabilityNote({ quote }: { quote: VerifiedQuote | null | undefined }) {
  if (!quote || !quote.verified) return null;
  if (quote.availability === "limited" && quote.unitsLeft) {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-800">
        נותרו {quote.unitsLeft} מקומות אצל הספק
      </span>
    );
  }
  if (quote.availability === "available") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-800">
        זמין לאישור מיידי
      </span>
    );
  }
  return null;
}
