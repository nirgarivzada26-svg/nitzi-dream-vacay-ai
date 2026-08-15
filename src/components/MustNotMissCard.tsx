// Must-Not-Miss ("דיל שאי אפשר לפספס") homepage card. Sources exclusively
// through getMustNotMissDeal() (getActiveOffers() + resolveOffer() for
// LIVE/SANDBOX) — never listDeals()/getDeal() directly, never a fabricated
// claim about unknown fields. Distinct from SecretDealCard (a separate,
// unmigrated demo-only discovery mechanic) — this card is the
// evidence-backed "strongest current offer" feature.

import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, Info, Plane, ShieldQuestion, Sparkles, Star } from "lucide-react";
import { mustNotMissQueryOptions } from "@/lib/must-not-miss.functions";

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

function UnknownPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/30 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/70">
      <ShieldQuestion className="h-3 w-3 shrink-0" aria-hidden /> {label}
    </span>
  );
}

export function MustNotMissCard() {
  const { data } = useSuspenseQuery(mustNotMissQueryOptions);

  if (!data.deal) {
    return (
      <section className="px-5">
        <div className="rounded-[2rem] border border-dashed border-border bg-muted/30 p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">{data.emptyReason}</p>
        </div>
      </section>
    );
  }

  const { offer, reasons, priceChanged } = data.deal;

  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-gradient-to-br from-slate-900 via-slate-900 to-primary/20 shadow-glow animate-fade-up">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="min-w-0 text-white">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> דיל שאי אפשר לפספס
            </div>

            <h2 className="mt-4 text-2xl font-black sm:text-3xl">
              {offer.destination.city}, {offer.destination.country}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/80">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              {offer.hotel.name}
              {offer.hotel.stars > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: offer.hotel.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </span>
              )}
            </div>

            {offer.flight && (
              <div className="mt-1 flex items-center gap-2 text-sm text-white/70">
                <Plane className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {offer.flight.outbound.airline}
                {offer.flight.outbound.stops === 0 ? " · טיסה ישירה" : " · עם קונקשן"}
              </div>
            )}

            <ul className="mt-4 space-y-1.5">
              {reasons.map((r) => (
                <li
                  key={r}
                  className="flex items-start gap-2 text-[13px] font-semibold text-white/90"
                >
                  <BadgeCheck
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                    aria-hidden
                  />
                  {r}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {offer.hotel.cancellationPolicy.kind === "unknown" && (
                <UnknownPill label="מדיניות ביטול טרם אומתה" />
              )}
              {offer.hotel.board === "unknown" && <UnknownPill label="בסיס אירוח לא ידוע" />}
            </div>

            {priceChanged && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
                המחיר עודכן כרגע מול הספק
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur lg:items-end lg:text-right">
            <div>
              <div className="text-[11px] font-bold text-white/60">מחיר לאדם</div>
              <div className="text-3xl font-black text-white">
                {offer.pricing.pricePerPerson !== null ? fmtILS(offer.pricing.pricePerPerson) : "—"}
              </div>
              <p className="mt-1 text-[11px] text-white/50">
                הדיל החזק ביותר ש-NITZI מצאה כרגע מתוך המלאי שנבדק. זמינות ומחיר ייבדקו שוב לפני
                ההזמנה.
              </p>
            </div>
            <Link
              to="/deal/$id"
              params={{ id: offer.canonicalId }}
              search={{ flight: undefined }}
              className="w-full rounded-2xl bg-gradient-sunset px-6 py-3 text-center text-sm font-black text-white shadow-glow lg:w-auto"
            >
              לצפייה בדיל
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
