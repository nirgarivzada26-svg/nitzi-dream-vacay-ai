// Renders the result of resolveOffer() for a canonical SANDBOX/LIVE id.
// Deliberately separate from the demo DealPage — CanonicalOffer fields that
// don't map honestly (board, cancellation, baggage, fare rules, room/rate)
// are shown as explicit "not verified"/"unknown" states here, never
// substituted with demo values or silently omitted.

import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Clock,
  Info,
  MapPin,
  Plane,
  ShieldQuestion,
  Star,
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
  cta,
}: {
  icon: React.ReactNode;
  tone: "info" | "warning" | "error";
  title: string;
  detail: string;
  cta?: { label: string; to: string };
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
        {cta && (
          <Link
            to={cta.to}
            className="mt-2 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow"
          >
            {cta.label}
          </Link>
        )}
      </main>
    </div>
  );
}

/** Small, honest "not verified"/"unknown" pill — never a fabricated value. */
function UnknownPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
      <ShieldQuestion className="h-3 w-3 shrink-0" aria-hidden /> {label}
    </span>
  );
}

function AvailableOfferView({ result }: { result: OfferResolution }) {
  const offer = result.refreshedOffer!;
  const priceChanged = result.status === "price_changed";

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16">
      <Header />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
            <BadgeCheck className="h-4 w-4" aria-hidden /> מחיר אומת מול הספק כרגע
          </div>
          <h1 className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
            {offer.destination.city}, {offer.destination.country}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {offer.hotel.name}
            {offer.hotel.stars > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: offer.hotel.stars }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Plane className="h-4 w-4" aria-hidden />
            {offer.flight?.outbound.airline}
            {offer.flight && offer.flight.outbound.stops === 0 ? " · ישירה" : " · עם קונקשן"}
          </div>

          {priceChanged && result.previousPrice !== null && result.currentPrice !== null && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-black text-amber-900">
                <Info className="h-4 w-4 shrink-0" aria-hidden /> המחיר התעדכן מאז שנצפה לראשונה
              </p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className="text-muted-foreground line-through">
                  {fmtILS(result.previousPrice)}
                </span>
                <span className="font-black text-foreground">{fmtILS(result.currentPrice)}</span>
                <span className="text-[11px] font-bold text-amber-800">
                  ({result.priceDifference! > 0 ? "+" : ""}
                  {fmtILS(result.priceDifference!)})
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800">
                המחיר החדש טרם אושר — יש לאשר אותו לפני המשך ההזמנה.
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">מלון</div>
              <div className="text-sm font-black">
                {result.priceBreakdown?.hotelComponent !== null &&
                result.priceBreakdown?.hotelComponent !== undefined
                  ? fmtILS(result.priceBreakdown.hotelComponent)
                  : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">טיסה</div>
              <div className="text-sm font-black">
                {result.priceBreakdown?.flightComponent !== null &&
                result.priceBreakdown?.flightComponent !== undefined
                  ? fmtILS(result.priceBreakdown.flightComponent)
                  : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">סה״כ לאדם</div>
              <div className="text-sm font-black text-primary">
                {result.currentPrice !== null ? fmtILS(result.currentPrice) : "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {offer.hotel.board === "unknown" ? (
              <UnknownPill label="בסיס אירוח לא ידוע" />
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold">
                {offer.hotel.board}
              </span>
            )}
            {offer.hotel.cancellationPolicy.kind === "unknown" ? (
              <UnknownPill label="מדיניות ביטול טרם אומתה" />
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                מדיניות ביטול זמינה
              </span>
            )}
            {!offer.flight?.outbound.baggage && <UnknownPill label="כבודה לא זמינה" />}
            {!offer.flight?.outbound.fareRules && <UnknownPill label="כללי מחיר לא זמינים" />}
            {!offer.hotel.roomRateRef && <UnknownPill label="פרטי חדר/תעריף לא זמינים" />}
          </div>
        </div>

        {/* Booking is not yet CanonicalOffer-aware (checkout/booking-request
            migrate in a later batch) — an honest, non-interactive notice,
            never a dead button. */}
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-[12px] font-bold text-muted-foreground">
          המשך ההזמנה יחובר בשלב הבא
        </div>
      </main>
    </div>
  );
}

export function LiveOfferView({ canonicalId }: { canonicalId: string }) {
  const { data: result } = useSuspenseQuery(dealResolutionQueryOptions(canonicalId));

  switch (result.status) {
    case "available":
    case "price_changed":
      return <AvailableOfferView result={result} />;
    case "expired":
      return (
        <StateScreen
          icon={<TimerOff className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="ההצעה הזו פגה"
          detail="כדאי לבצע חיפוש חדש כדי לראות מחיר וזמינות עדכניים."
          cta={{ label: "לחיפוש חדש", to: "/packages" }}
        />
      );
    case "sold_out":
      return (
        <StateScreen
          icon={<XCircle className="h-7 w-7" aria-hidden />}
          tone="error"
          title="ההצעה הזו כבר לא זמינה"
          detail="החדר או הטיסה שביקשתם אזלו. אפשר לחפש חבילות דומות."
          cta={{ label: "חיפוש חבילות דומות", to: "/packages" }}
        />
      );
    case "availability_changed":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="הזמינות של ההצעה השתנתה"
          detail="חלק מפרטי ההצעה המקורית כבר לא זמינים כפי שהיו. מומלץ לחפש שוב כדי לראות את האפשרויות העדכניות."
          cta={{ label: "חיפוש חבילות דומות", to: "/packages" }}
        />
      );
    case "provider_unavailable":
      return (
        <StateScreen
          icon={<AlertTriangle className="h-7 w-7" aria-hidden />}
          tone="warning"
          title="לא ניתן לאמת את ההצעה כרגע"
          detail="יש בעיה זמנית בתקשורת מול הספק. נסו שוב בעוד מספר דקות."
          cta={{ label: "לעמוד הבית", to: "/" }}
        />
      );
    case "unsupported":
      return (
        <StateScreen
          icon={<Info className="h-7 w-7" aria-hidden />}
          tone="info"
          title="לא ניתן להציג את ההצעה במלואה כרגע"
          detail="חלק מהנתונים הדרושים טרם זמינים מהספק עבור הצעה זו."
          cta={{ label: "לחיפוש חדש", to: "/packages" }}
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
          cta={{ label: "לעמוד הבית", to: "/" }}
        />
      );
  }
}
