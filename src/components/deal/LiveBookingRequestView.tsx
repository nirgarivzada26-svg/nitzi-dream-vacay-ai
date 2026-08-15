// LIVE booking-request — mirrors LiveOfferView's pattern. Never renders a
// fake Deal, never borrows missing fields from demo data. price_changed is
// allowed to continue to checkout (checkout re-resolves fresh on its own
// load, and the mandatory pre-booking revalidation in placeLiveBooking is
// the real gate) — but expired/sold_out/provider_unavailable/unsupported/
// not_found never get a "continue" CTA at all.

import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock,
  Info,
  MapPin,
  Plane,
  ShieldQuestion,
  TimerOff,
  XCircle,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { dealResolutionQueryOptions } from "@/lib/deal-resolution.functions";
import type { OfferResolution } from "@/lib/offers/resolution";

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

function Header() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
          aria-label="חזרה לעמוד הבית"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <NitziLogo />
        <span className="w-11" />
      </div>
    </header>
  );
}

function StateScreen({
  icon,
  tone,
  title,
  detail,
}: {
  icon: React.ReactNode;
  tone: "info" | "warning" | "error";
  title: string;
  detail: string;
}) {
  const toneClass =
    tone === "error"
      ? "bg-rose-50 text-rose-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-900"
        : "bg-sky-50 text-sky-900";
  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-20 text-center">
        <span className={`grid h-16 w-16 place-items-center rounded-full ${toneClass}`}>
          {icon}
        </span>
        <h1 className="text-2xl font-black text-foreground">{title}</h1>
        <p className="text-sm font-semibold text-muted-foreground">{detail}</p>
        <Link
          to="/packages"
          className="mt-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow"
        >
          חיפוש חבילות
        </Link>
      </main>
    </div>
  );
}

function UnknownPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
      <ShieldQuestion className="h-3 w-3 shrink-0" aria-hidden /> {label}
    </span>
  );
}

function AvailableBookingRequest({
  canonicalId,
  result,
}: {
  canonicalId: string;
  result: OfferResolution;
}) {
  const offer = result.refreshedOffer!;
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <Header />
      <main className="mx-auto w-full max-w-[1000px] space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-black sm:text-3xl">בקשת הזמנה</h1>
        <p className="text-sm text-muted-foreground">
          {offer.destination.city}, {offer.destination.country}
        </p>

        {result.status === "price_changed" && result.previousPrice !== null && (
          <p className="flex items-center gap-2 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-[12px] font-bold text-amber-900">
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            המחיר התעדכן: {fmtILS(result.previousPrice)} ← {fmtILS(result.currentPrice!)}
          </p>
        )}

        <section className="grid gap-2 rounded-3xl border border-border bg-card p-5 shadow-soft sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                מלון
              </div>
              <div className="truncate text-sm font-black text-foreground">{offer.hotel.name}</div>
              <div className="text-[11px] text-muted-foreground">{offer.hotel.stars}★</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Plane className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                טיסה
              </div>
              <div className="truncate text-sm font-black text-foreground">
                {offer.flight?.outbound.airline}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {offer.flight?.outbound.stops === 0 ? "ישירה" : "עם קונקשן"}
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-1.5">
          {offer.hotel.board === "unknown" && <UnknownPill label="בסיס אירוח לא ידוע" />}
          {offer.hotel.cancellationPolicy.kind === "unknown" && (
            <UnknownPill label="מדיניות ביטול טרם אומתה" />
          )}
          {!offer.flight?.outbound.baggage && <UnknownPill label="כבודה לא זמינה" />}
          {!offer.flight?.outbound.fareRules && <UnknownPill label="כללי מחיר לא זמינים" />}
        </div>

        <p className="flex items-start gap-2 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-[12px] font-semibold text-sky-900">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          המחיר יאומת שוב מול הספק לפני אישור סופי. לא יתבצע חיוב בשלב זה.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              סה״כ לאדם
            </div>
            <div className="text-xl font-black">
              {result.currentPrice !== null ? fmtILS(result.currentPrice) : "—"}
            </div>
          </div>
          <Link
            to="/checkout/$id"
            params={{ id: canonicalId }}
            search={{ flight: undefined }}
            className="ms-auto rounded-2xl bg-gradient-sunset px-6 py-3 text-sm font-black text-white shadow-glow"
          >
            המשך לפרטי נוסעים
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LiveBookingRequestView({ canonicalId }: { canonicalId: string }) {
  const { data: result } = useSuspenseQuery(dealResolutionQueryOptions(canonicalId));

  switch (result.status) {
    case "available":
    case "price_changed":
      return <AvailableBookingRequest canonicalId={canonicalId} result={result} />;
    case "expired":
      return (
        <StateScreen
          icon={<TimerOff className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="ההצעה הזו פגה"
          detail="כדאי לבצע חיפוש חדש כדי לראות מחיר וזמינות עדכניים."
        />
      );
    case "sold_out":
      return (
        <StateScreen
          icon={<XCircle className="h-7 w-7" aria-hidden />}
          tone="error"
          title="ההצעה הזו כבר לא זמינה"
          detail="החדר או הטיסה שביקשתם אזלו."
        />
      );
    case "availability_changed":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="הזמינות של ההצעה השתנתה"
          detail="מומלץ לחפש שוב כדי לראות את האפשרויות העדכניות."
        />
      );
    case "provider_unavailable":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="לא ניתן לאמת את ההצעה כרגע"
          detail="יש בעיה זמנית בתקשורת מול הספק. נסו שוב בעוד מספר דקות."
        />
      );
    case "unsupported":
      return (
        <StateScreen
          icon={<Info className="h-7 w-7" aria-hidden />}
          tone="info"
          title="לא ניתן להציג את ההצעה במלואה כרגע"
          detail="חלק מהנתונים הדרושים טרם זמינים מהספק עבור הצעה זו."
        />
      );
    case "not_found":
    default:
      return (
        <StateScreen
          icon={<Clock className="h-7 w-7" aria-hidden />}
          tone="info"
          title="ההצעה לא נמצאה"
          detail="ייתכן שהקישור שגוי או שההצעה כבר לא קיימת."
        />
      );
  }
}
