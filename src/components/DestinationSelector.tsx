// Reusable destination selector.
//
// Single source of truth: it renders whatever is in the managed catalog, after
// validation, and searches by city (Hebrew/English), country, airport code and
// region. Mobile: full-screen sheet with a sticky search field.

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, X, MapPin, Plane, Clock } from "lucide-react";
import { useDestinations } from "@/lib/use-catalog";
import type { Destination } from "@/lib/catalog";
import {
  DESTINATION_FACETS,
  groupDestinationsByCountry,
  readRecentDestinations,
  rememberDestination,
  searchDestinations,
  type DestinationFacet,
} from "@/lib/destination-search";
import { DestinationImage } from "@/components/DestinationImage";

export interface DestinationSelectorProps {
  open: boolean;
  onClose: () => void;
  /** Receives the catalog slug — the stable identifier — or "surprise". */
  onSelect: (slug: string) => void;
  /** Currently selected slug, highlighted in the list. */
  value?: string | null;
  /** Show the "let NITZI choose" shortcut. */
  allowSurprise?: boolean;
  title?: string;
}

export function DestinationSelector({
  open,
  onClose,
  onSelect,
  value = null,
  allowSurprise = true,
  title = "בחר יעד",
}: DestinationSelectorProps) {
  const catalog = useDestinations();
  const [q, setQ] = useState("");
  const [facet, setFacet] = useState<DestinationFacet>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setFacet("all");
      setRecent(readRecentDestinations());
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(
    () => searchDestinations(catalog, { query: q, facet }),
    [catalog, q, facet],
  );
  const grouped = useMemo(() => groupDestinationsByCountry(results), [results]);

  const bySlug = useMemo(() => new Map(catalog.map((d) => [d.slug, d])), [catalog]);
  const recentItems = useMemo(
    () => recent.map((s) => bySlug.get(s)).filter((d): d is Destination => !!d),
    [recent, bySlug],
  );
  const trending = useMemo(
    () => searchDestinations(catalog, { facet: "trending", limit: 8 }),
    [catalog],
  );
  const popular = useMemo(
    () => searchDestinations(catalog, { facet: "popular", limit: 9 }),
    [catalog],
  );

  const pick = (slug: string) => {
    rememberDestination(slug);
    onSelect(slug);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-background shadow-2xl sm:h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 pt-5 pb-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
              <MapPin className="h-5 w-5 text-primary" /> {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="סגור"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="עיר, מדינה, אזור או קוד שדה תעופה (TLV, BCN...)"
              aria-label="חיפוש יעד"
              className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
            />
          </div>
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {DESTINATION_FACETS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFacet(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-black transition active:scale-95 ${
                  facet === f.id
                    ? "bg-gradient-sunset text-white shadow-glow"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {allowSurprise && (
            <button
              onClick={() => pick("surprise")}
              className="group mb-5 flex w-full items-center gap-3 rounded-2xl bg-gradient-sunset p-4 text-right text-white shadow-glow transition active:scale-[0.98]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black">NITZI יבחר בשבילי</span>
                <span className="block text-xs text-white/85">
                  AI ימצא לך את היעד המושלם על סמך התקציב והסגנון
                </span>
              </span>
            </button>
          )}

          {!q && facet === "all" && recentItems.length > 0 && (
            <Shelf title="אחרונים" icon={<Clock className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {recentItems.map((d) => (
                  <TileButton key={`recent-${d.slug}`} d={d} onPick={pick} />
                ))}
              </div>
            </Shelf>
          )}

          {!q && facet === "all" && trending.length > 0 && (
            <Shelf title="🔥 חמים עכשיו">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {trending.map((d) => (
                  <TileButton key={`trend-${d.slug}`} d={d} onPick={pick} />
                ))}
              </div>
            </Shelf>
          )}

          {!q && facet === "all" && popular.length > 0 && (
            <Shelf title="⭐ פופולריים">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {popular.map((d) => (
                  <TileButton key={`pop-${d.slug}`} d={d} onPick={pick} />
                ))}
              </div>
            </Shelf>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              לא נמצאו יעדים תואמים. נסה חיפוש אחר או תן ל-NITZI לבחור.
            </div>
          ) : (
            grouped.map(([country, group]) => (
              <div key={country} className="mb-5">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span className="text-base">{group.emoji}</span> {country}
                </h3>
                <div className="space-y-2">
                  {group.items.map((d) => (
                    <Row key={d.slug} d={d} selected={value === d.slug} onPick={pick} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Shelf({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function TileButton({ d, onPick }: { d: Destination; onPick: (slug: string) => void }) {
  return (
    <button
      onClick={() => onPick(d.slug)}
      className="group relative h-24 overflow-hidden rounded-2xl text-right transition active:scale-[0.97]"
    >
      <DestinationImage
        destination={d}
        className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2 text-white">
        <p className="text-[10px] font-semibold text-white/85">
          {d.country} {d.emoji}
        </p>
        <p className="text-sm font-black leading-tight">{d.name}</p>
      </div>
      {d.directFlightFromTLV && (
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-foreground">
          ישירה
        </span>
      )}
    </button>
  );
}

function Row({
  d,
  selected,
  onPick,
}: {
  d: Destination;
  selected: boolean;
  onPick: (slug: string) => void;
}) {
  return (
    <button
      onClick={() => onPick(d.slug)}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition active:scale-[0.99] ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/25"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"
      }`}
    >
      <DestinationImage
        destination={d}
        sizeHint="sm"
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-black text-foreground">
          {d.name} <span className="text-xs text-muted-foreground">{d.emoji}</span>
          {d.cityEn && (
            <span className="text-[10px] font-bold text-muted-foreground">{d.cityEn}</span>
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <span>
            {d.country} · {d.subregion || d.region}
          </span>
          {d.airportCodes.length > 0 && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-black tracking-wider text-foreground/70">
              {d.airportCodes.join(" · ")}
            </span>
          )}
          {d.directFlightFromTLV && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-black text-emerald-700">
              <Plane className="h-3 w-3" /> ישירה מתל אביב
            </span>
          )}
        </span>
      </span>
      <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
        {d.hasOffers ? `מ־₪${d.avgBudgetPerPerson.toLocaleString()}` : "אין דילים כרגע"}
      </span>
    </button>
  );
}
