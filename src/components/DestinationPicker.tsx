import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, X, MapPin } from "lucide-react";
import { destinations, popularDestinations } from "@/lib/nitzi-data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export function DestinationPicker({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return destinations;
    return destinations.filter(
      (d) => d.name.includes(term) || d.country.includes(term) || d.tagline.includes(term)
    );
  }, [q]);

  // Group by country
  const grouped = useMemo(() => {
    const map = new Map<string, { emoji: string; items: typeof destinations }>();
    for (const d of filtered) {
      const g = map.get(d.country) ?? { emoji: d.emoji, items: [] as typeof destinations };
      g.items.push(d);
      map.set(d.country, g);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const popular = destinations.filter((d) =>
    popularDestinations.some((p) => d.country.includes(p) || p.includes(d.country) || d.name.includes(p))
  );

  const pick = (name: string) => { onSelect(name); onClose(); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} dir="rtl">
      <div
        className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden bg-background shadow-2xl sm:h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 pt-5 pb-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
              <MapPin className="h-5 w-5 text-primary" /> בחר יעד
            </h2>
            <button onClick={onClose} aria-label="סגור" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חפש מדינה, עיר או אווירה..."
              className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <button
            onClick={() => pick("surprise")}
            className="group mb-5 flex w-full items-center gap-3 rounded-2xl bg-gradient-sunset p-4 text-right text-white shadow-glow transition active:scale-[0.98]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black">NITZI יבחר בשבילי</span>
              <span className="block text-xs text-white/85">AI ימצא לך את היעד המושלם על סמך התקציב והסגנון</span>
            </span>
          </button>

          {!q && popular.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">🔥 פופולריים</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {popular.map((d) => (
                  <button key={`pop-${d.name}`} onClick={() => pick(d.name)} className="group relative h-24 overflow-hidden rounded-2xl text-right transition active:scale-[0.97]">
                    <img src={d.image} alt={d.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                      <p className="text-[10px] font-semibold text-white/85">{d.country} {d.emoji}</p>
                      <p className="text-sm font-black leading-tight">{d.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
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
                    <button
                      key={d.name}
                      onClick={() => pick(d.name)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-right transition hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99]"
                    >
                      <img src={d.image} alt={d.name} loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-black text-foreground">
                          {d.name} <span className="text-xs text-muted-foreground">{d.emoji}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-foreground">{d.tagline}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                        מ־₪{d.avgBudgetPerPerson.toLocaleString()}
                      </span>
                    </button>
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
