import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftCircle,
  BadgeCheck,
  GitCompare,
  Heart,
  MessageCircleQuestion,
  Moon,
  Plane,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { boardLabels } from "@/lib/deals";
import { cancellationSummary } from "@/lib/cancellation-policy";
import type { AgentComparison, AgentRecommendation } from "@/lib/agent/agent-types";
import { isCompared, toggleCompare } from "@/lib/compare-store";
import { addFavorite } from "@/lib/user-data";
import { getDeal } from "@/lib/deals";
import { useDestinations } from "@/lib/use-catalog";
import { DestinationImage } from "@/components/DestinationImage";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short" });

const SMART_CLS: Record<string, string> = {
  great: "bg-emerald-100 text-emerald-800",
  good: "bg-emerald-50 text-emerald-800",
  normal: "bg-amber-100 text-amber-900",
  expensive: "bg-rose-100 text-rose-800",
  unknown: "bg-muted text-muted-foreground",
};

export function RecommendationCard({
  rec,
  allRecommendations,
  onAskFollowUp,
}: {
  rec: AgentRecommendation;
  /** The full recommendations array from the SAME tool call — alternative
   *  lookups below only ever resolve within this array, never elsewhere. */
  allRecommendations?: AgentRecommendation[];
  onAskFollowUp?: (prefillText: string) => void;
}) {
  const catalog = useDestinations();
  const [compared, setCompared] = useState(rec.dealId ? isCompared(rec.dealId, "package") : false);
  const [saving, setSaving] = useState(false);

  const dest = catalog.find((d) => d.slug === rec.destinationSlug);

  // Resolve alternative dealIds strictly within allRecommendations — if the
  // referenced dealId isn't actually present in this same result set (it
  // always should be, per agent-search.server.ts, but this guards against
  // ever silently trusting an id that isn't visibly on screen), we don't
  // render the alternative rather than risk pointing at an unseen deal.
  const cheaperAlt = allRecommendations?.find(
    (r) => r.dealId && r.dealId === rec.cheaperAlternativeDealId,
  );
  const betterAlt = allRecommendations?.find(
    (r) => r.dealId && r.dealId === rec.betterAlternativeDealId,
  );

  const onSave = async () => {
    if (!rec.dealId) return;
    setSaving(true);
    try {
      const deal = getDeal(rec.dealId, catalog);
      if (!deal) throw new Error("deal not found");
      await addFavorite(deal);
      toast.success("נשמר במועדפים");
    } catch {
      toast.error("צריך להתחבר כדי לשמור חופשות");
    } finally {
      setSaving(false);
    }
  };

  const onCompare = () => {
    if (!rec.dealId) return;
    toggleCompare({ id: rec.dealId, kind: "package" });
    setCompared(isCompared(rec.dealId, "package"));
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-card text-right shadow-soft">
      <div className="relative h-[180px] w-full overflow-hidden sm:h-[200px]">
        {dest ? (
          <DestinationImage destination={dest} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-foreground backdrop-blur">
          <BadgeCheck className="h-3 w-3 text-emerald-600" /> NITZI Score {rec.nitziScore}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[11px] font-bold text-white/85">
            {rec.country} {rec.emoji}
          </p>
          <h4 className="text-xl font-black leading-tight">{rec.destination}</h4>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <p className="line-clamp-1 text-sm font-black">{rec.hotelName}</p>

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
          {rec.smartPrice && (
            <span className={`rounded-full px-2 py-1 ${SMART_CLS[rec.smartPrice.level]}`}>
              {rec.smartPrice.emoji} {rec.smartPrice.label}
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {rec.hotelStars}★ ·{" "}
            {rec.guestRating}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Moon className="h-3 w-3" /> {rec.nights} לילות
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Users className="h-3 w-3" /> {rec.people}
          </span>
          {rec.board === "unknown" ? (
            <span className="rounded-full border border-dashed border-border px-2 py-1 text-muted-foreground">
              בסיס אירוח לא ידוע
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-1">{boardLabels[rec.board]}</span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Plane className="h-3 w-3" /> {rec.outbound.airline} ·{" "}
            {rec.outbound.stops === 0 ? "ישירה" : `${rec.outbound.stops} עצירות`}
          </span>
          <span
            className={`rounded-full px-2 py-1 ${
              rec.cancellationPolicy.kind === "free" || rec.cancellationPolicy.kind === "free_until"
                ? "bg-emerald-50 text-emerald-800"
                : rec.cancellationPolicy.kind === "unknown"
                  ? "bg-muted text-muted-foreground"
                  : "bg-amber-50 text-amber-900"
            }`}
          >
            {cancellationSummary(rec.cancellationPolicy, rec.startDate)}
          </span>
        </div>

        <p className="text-[11px] font-semibold text-muted-foreground">
          {fmtDate(rec.startDate)} – {fmtDate(rec.endDate)} · מקור: {rec.source} · עודכן{" "}
          {new Date(rec.verifiedAt).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <ul className="space-y-1 rounded-2xl bg-muted/50 p-3 text-[12px] font-semibold leading-relaxed">
          {rec.reasons.map((r) => (
            <li key={r} className="flex gap-1.5">
              <span className="text-primary">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {(rec.advantage || rec.compromise) && (
          <div className="space-y-1 text-[12px] font-semibold">
            {rec.advantage && (
              <p className="flex items-start gap-1.5 text-emerald-800">
                <span aria-hidden>✓</span>
                <span>
                  <b className="font-black">יתרון עיקרי:</b> {rec.advantage}
                </span>
              </p>
            )}
            {rec.compromise && (
              <p className="flex items-start gap-1.5 text-amber-800">
                <span aria-hidden>⚠</span>
                <span>
                  <b className="font-black">שווה לדעת:</b> {rec.compromise}
                </span>
              </p>
            )}
          </div>
        )}

        {(cheaperAlt || betterAlt) && (
          <div className="flex flex-wrap gap-1.5">
            {cheaperAlt && (
              <Link
                to="/deal/$id"
                params={{ id: cheaperAlt.dealId! }}
                search={{ flight: undefined }}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ArrowLeftCircle className="h-3 w-3" aria-hidden /> יש זול יותר:{" "}
                {fmt(cheaperAlt.pricePerPerson)} ב{cheaperAlt.destination}
              </Link>
            )}
            {betterAlt && (
              <Link
                to="/deal/$id"
                params={{ id: betterAlt.dealId! }}
                search={{ flight: undefined }}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Sparkles className="h-3 w-3" aria-hidden /> יש מלון טוב יותר ב
                {betterAlt.destination}
              </Link>
            )}
          </div>
        )}

        {rec.note && (
          <p className="rounded-2xl border border-dashed border-border p-2.5 text-[11px] font-bold text-muted-foreground">
            {rec.note}
          </p>
        )}

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">החל מ־</p>
            <p className="text-2xl font-black leading-none">{fmt(rec.pricePerPerson)}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              לאדם · סה״כ {fmt(rec.totalPrice)}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {onAskFollowUp && (
              <button
                type="button"
                onClick={() => onAskFollowUp(`לגבי ${rec.destination}: `)}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background"
                aria-label="שאלת המשך ל-NITZI"
                title="שאלת המשך ל-NITZI"
              >
                <MessageCircleQuestion className="h-4 w-4" />
              </button>
            )}
            {rec.dealId && (
              <>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background"
                  aria-label="שמור למועדפים"
                >
                  <Heart className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onCompare}
                  className={`grid h-10 w-10 place-items-center rounded-2xl border ${
                    compared
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background"
                  }`}
                  aria-label="הוסף להשוואה"
                >
                  <GitCompare className="h-4 w-4" />
                </button>
                <Link
                  to="/deal/$id"
                  params={{ id: rec.dealId }}
                  search={{ flight: undefined }}
                  className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-black text-foreground"
                >
                  לצפייה בדיל
                </Link>
                <Link
                  to="/booking-request/$dealId"
                  params={{ dealId: rec.dealId }}
                  search={{ flight: undefined }}
                  className="rounded-2xl bg-gradient-sunset px-4 py-2.5 text-sm font-black text-white shadow-glow"
                >
                  המשך להזמנה
                </Link>
              </>
            )}
            {!rec.dealId && (
              <Link
                to="/flights"
                className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-black"
              >
                בדוק טיסות ליעד
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ComparisonTable({ data }: { data: AgentComparison }) {
  if (data.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-4 text-sm font-bold">
        לא נמצאו דילים להשוואה.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
      <table className="w-full min-w-[520px] text-right text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className="p-3 text-[11px] font-black text-muted-foreground">פרמטר</th>
            {data.items.map((it) => (
              <th key={it.dealId} className="p-3 text-sm font-black">
                {it.destination}
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold">
                  {data.bestValueDealId === it.dealId && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      הכי משתלם
                    </span>
                  )}
                  {data.cheapestDealId === it.dealId && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                      הזול ביותר
                    </span>
                  )}
                  {data.bestHotelDealId === it.dealId && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                      המלון הטוב ביותר
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.label} className="border-b border-border/40 last:border-0">
              <td className="p-3 text-[12px] font-black text-muted-foreground">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={`${row.label}-${i}`} className="p-3 text-[13px] font-semibold">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
