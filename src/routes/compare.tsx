import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles, Star, X } from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { clearCompare, toggleCompare, useCompare } from "@/lib/compare-store";
import { findHotel, findPackage, getResultsCache } from "@/lib/results-cache";
import { amenityLabel } from "@/lib/explain";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "השוואה — NITZI" },
      { name: "description", content: "השוואה בין מלונות או חבילות שבחרת: מחיר, דירוג, שירותים ותנאי ביטול." },
      { property: "og:title", content: "השוואה — NITZI" },
      { property: "og:description", content: "טבלת השוואה שקופה של NITZI." },
    ],
  }),
  component: ComparePage,
});

function fmtILS(n: number) { return `₪${Math.round(n).toLocaleString()}`; }

function ComparePage() {
  const items = useCompare();
  const navigate = useNavigate();
  const cache = getResultsCache();

  const empty = items.length === 0 || !cache;

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => navigate({ to: "/result" })} className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card" aria-label="חזרה">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </button>
          <NitziLogo />
          <button onClick={clearCompare} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold">נקה</button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
          <Sparkles className="h-6 w-6 text-primary" /> השוואה חכמה של NITZI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">בחר עד 4 פריטים מדף התוצאות והשווה בין הפרמטרים החשובים.</p>

        {empty ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg font-black">אין פריטים בהשוואה</p>
            <p className="mt-2 text-sm text-muted-foreground">חזור לעמוד התוצאות והוסף מלונות או חבילות באמצעות כפתור "השווה".</p>
            <button onClick={() => navigate({ to: "/result" })} className="mt-4 rounded-2xl bg-gradient-sunset px-5 py-2 text-sm font-black text-white shadow-glow">
              לתוצאות
            </button>
          </div>
        ) : items[0].kind === "hotel" ? (
          <HotelCompareTable ids={items.map((i) => i.id)} nights={cache.answers.days} />
        ) : (
          <PackageCompareTable ids={items.map((i) => i.id)} />
        )}
      </div>
    </div>
  );
}

function HotelCompareTable({ ids, nights }: { ids: string[]; nights: number }) {
  const hotels = ids.map(findHotel).filter(Boolean) as NonNullable<ReturnType<typeof findHotel>>[];
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-40 text-right text-xs font-bold text-muted-foreground"></th>
            {hotels.map((h) => (
              <th key={h.id} className="rounded-2xl bg-card p-3 text-right align-top">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{h.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{h.location}</p>
                  </div>
                  <button onClick={() => toggleCompare({ id: h.id, kind: "hotel" })} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background" aria-label="הסר">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          <Row label="מחיר ללילה" cells={hotels.map((h) => <span className="font-black text-foreground">{fmtILS(h.pricePerNight)}</span>)} />
          <Row label={`סה״כ ל-${nights} לילות`} cells={hotels.map((h) => <span className="font-black text-primary">{fmtILS(h.pricePerNight * nights)}</span>)} />
          <Row label="כוכבים" cells={hotels.map((h) => <span className="inline-flex">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</span>)} />
          <Row label="דירוג אורחים" cells={hotels.map((h) => <span className="font-bold">{h.guestRating.toFixed(1)}/10</span>)} />
          <Row label="מרחק מהחוף" cells={hotels.map((h) => h.distanceToBeachKm != null ? `${h.distanceToBeachKm} ק״מ` : "—")} />
          <Row label="מרחק מהמרכז" cells={hotels.map((h) => h.distanceToCenterKm != null ? `${h.distanceToCenterKm} ק״מ` : "—")} />
          <Row label="ציון NITZI" cells={hotels.map((h) => <span className="rounded-full bg-gradient-sunset px-2.5 py-0.5 text-xs font-black text-white">{h.score}%</span>)} />
          {["breakfast", "pool", "spa", "wifi", "beachfront", "family"].map((am) => (
            <Row key={am} label={amenityLabel(am)} cells={hotels.map((h) => h.amenities.includes(am) ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-muted-foreground/60" />)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackageCompareTable({ ids }: { ids: string[] }) {
  const pkgs = ids.map(findPackage).filter(Boolean) as NonNullable<ReturnType<typeof findPackage>>[];
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-40"></th>
            {pkgs.map((p) => (
              <th key={p.id} className="rounded-2xl bg-card p-3 text-right align-top">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-base font-black">{p.title}</p>
                  <button onClick={() => toggleCompare({ id: p.id, kind: "package" })} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background"><X className="h-3 w-3" /></button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          <Row label="מחיר כולל" cells={pkgs.map((p) => <span className="font-black text-primary">{fmtILS(p.totalPrice)}</span>)} />
          <Row label="במקום" cells={pkgs.map((p) => <span className="text-muted-foreground line-through">{fmtILS(p.separatePrice)}</span>)} />
          <Row label="חיסכון" cells={pkgs.map((p) => <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{Math.round((p.savings / p.separatePrice) * 100)}%</span>)} />
          <Row label="לילות" cells={pkgs.map((p) => `${p.nights}`)} />
          <Row label="דירוג" cells={pkgs.map((p) => `${p.rating}/10`)} />
          <Row label="מלון" cells={pkgs.map((p) => p.hotel.name)} />
          <Row label="כוכבים" cells={pkgs.map((p) => `${p.hotel.stars}★`)} />
          <Row label="טיסה" cells={pkgs.map((p) => `${p.flight.airline} · ${p.flight.stops === 0 ? "ישירה" : `${p.flight.stops} עצירות`}`)} />
          <Row label="ציון NITZI" cells={pkgs.map((p) => <span className="rounded-full bg-gradient-sunset px-2.5 py-0.5 text-xs font-black text-white">{p.score}%</span>)} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <tr>
      <td className="p-3 text-right text-xs font-bold text-muted-foreground">{label}</td>
      {cells.map((c, i) => <td key={i} className="rounded-2xl bg-card p-3 text-right">{c}</td>)}
    </tr>
  );
}
