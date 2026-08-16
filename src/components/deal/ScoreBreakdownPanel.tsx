import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ScoreBreakdown } from "@/lib/deal-scores";
import { NO_DATA } from "@/lib/deal-scores";

function barColor(v: number) {
  if (v >= 80) return "bg-emerald-500";
  if (v >= 60) return "bg-sky-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function ScoreBreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-sunset text-white">
          <span className="text-lg font-black">
            {breakdown.overall === null ? "—" : breakdown.overall}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black">ניקוד NITZI כולל</p>
          <p className="text-[11px] text-muted-foreground">
            משוקלל ממלון (30%), מחיר (30%), טיסה (25%) ומיקום (15%). {breakdown.coverage.scored}{" "}
            מתוך {breakdown.coverage.total} מדדים מגובים בנתונים.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {breakdown.groups.map((g) => {
          const isOpen = open === g.key;
          return (
            <li key={g.key} className="rounded-2xl border border-border bg-background/60">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-3 text-right"
              >
                <span className="w-20 shrink-0 text-[12px] font-black">{g.label}</span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  {g.value !== null && (
                    <span
                      className={`block h-full rounded-full ${barColor(g.value)}`}
                      style={{ width: `${g.value}%` }}
                    />
                  )}
                </span>
                <span className="w-12 shrink-0 text-left text-[12px] font-black">
                  {g.value === null ? "—" : `${g.value}`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <ul className="space-y-1.5 border-t border-border/70 p-3">
                  {g.metrics.map((m) => (
                    <li key={`${g.key}-${m.key}`} className="text-[12px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black">{m.label}</span>
                        <span className="font-black text-muted-foreground">
                          {m.value === null ? NO_DATA : `${m.value}/100`}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.basis}</p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
