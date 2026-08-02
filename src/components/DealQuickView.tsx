// Rich preview modal — opens from a package card so the user can inspect a
// deal without leaving the page they are browsing.

import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  GitCompare,
  Heart,
  Moon,
  Plane,
  Share2,
  Sparkles,
  Star,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { boardLabels, type Deal } from "@/lib/deals";
import { DestinationImage } from "@/components/DestinationImage";
import { SmartPriceBadge } from "@/components/SmartPriceBadge";
import { dealReasons, nitziScore, topAmenities } from "@/lib/deal-insights";

const fmt = (n: number) => `₪${Math.round(n).toLocaleString()}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short" });

interface Props {
  deal: Deal;
  onClose: () => void;
  onToggleFavorite: () => void;
  favorited: boolean;
  onToggleCompare: () => void;
  compared: boolean;
  onShare: () => void;
}

export function DealQuickView({
  deal,
  onClose,
  onToggleFavorite,
  favorited,
  onToggleCompare,
  compared,
  onShare,
}: Props) {
  const score = nitziScore(deal);
  const reasons = dealReasons(deal);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] grid place-items-end bg-black/60 backdrop-blur-sm sm:place-items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`תצוגה מהירה — ${deal.destination.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="relative h-56 w-full overflow-hidden sm:h-72">
          <DestinationImage
            destination={deal.destination}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            aria-label="סגור"
            className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground backdrop-blur"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-foreground backdrop-blur">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> מחיר אומת ·{" "}
            {deal.price.source}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs font-bold text-white/85">
              {deal.destination.country} {deal.destination.emoji}
            </p>
            <h3 className="text-3xl font-black leading-tight">{deal.destination.name}</h3>
            <p className="mt-0.5 text-sm font-bold text-white/90">{deal.hotel.name}</p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <SmartPriceBadge deal={deal} />
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              <Sparkles className="h-3 w-3" /> ציון NITZI {score}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {deal.hotel.stars}★ ·{" "}
              {deal.hotel.guestRating}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              {boardLabels[deal.board]}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Fact
              icon={<Plane className="h-3.5 w-3.5" />}
              label="טיסה"
              value={`${deal.outbound.airline} · ${
                deal.outbound.stops === 0 ? "ישירה" : `${deal.outbound.stops} עצירות`
              }`}
            />
            <Fact
              icon={<Moon className="h-3.5 w-3.5" />}
              label="תאריכים"
              value={`${fmtDate(deal.dates.start)}–${fmtDate(deal.dates.end)} · ${deal.dates.nights} לילות`}
            />
            <Fact
              icon={<Sun className="h-3.5 w-3.5" />}
              label="מזג אוויר"
              value={deal.destination.weather}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
              <p className="text-[11px] font-black text-muted-foreground">מה כלול</p>
              <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                {topAmenities(deal).map((a) => (
                  <li key={a} className="flex gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-black text-primary">
                <Sparkles className="h-3.5 w-3.5" /> למה NITZI ממליץ
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                {reasons.slice(0, 3).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground">
                <Clock className="ml-1 inline h-3 w-3" /> סה״כ {fmt(deal.price.total)} ל־
                {deal.people} נוסעים
              </p>
              {deal.discountPct > 0 && (
                <p className="text-[11px] font-bold text-muted-foreground line-through">
                  {fmt(deal.listPricePerPerson)} לאדם
                </p>
              )}
            </div>
            <div className="text-left">
              <div className="text-3xl font-black text-foreground">{fmt(deal.price.perPerson)}</div>
              <div className="text-[11px] font-bold text-muted-foreground">לאדם</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              to="/deal/$id"
              params={{ id: deal.id }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow"
            >
              לדיל המלא
            </Link>
            <Link
              to="/deal/$id"
              params={{ id: deal.id }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-black text-foreground hover:border-primary/50"
            >
              <Wallet className="h-4 w-4" /> הזמן עכשיו
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MiniAction
              onClick={onToggleFavorite}
              active={favorited}
              icon={<Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />}
              label="שמור"
            />
            <MiniAction
              onClick={onToggleCompare}
              active={compared}
              icon={<GitCompare className="h-4 w-4" />}
              label="השווה"
            />
            <MiniAction
              onClick={onShare}
              active={false}
              icon={<Share2 className="h-4 w-4" />}
              label="שתף"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-xs font-black text-foreground">{value}</div>
    </div>
  );
}

function MiniAction({
  onClick,
  active,
  icon,
  label,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-foreground hover:border-primary/50"
      }`}
    >
      {icon} {label}
    </button>
  );
}
