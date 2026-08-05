import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Minus } from "lucide-react";
import { ANGLE_LABEL, type Comparison } from "@/lib/deal-comparison";

const ils = (n: number) => `₪${Math.round(Math.abs(n)).toLocaleString("he-IL")}`;

export function DealComparison({ comparisons }: { comparisons: Comparison[] }) {
  if (comparisons.length === 0)
    return (
      <p className="rounded-2xl bg-muted p-3 text-[12px] font-bold text-muted-foreground">
        לא נמצאה חבילה מקבילה בקטלוג להשוואה בתאריכים אלה.
      </p>
    );

  return (
    <div className="space-y-4">
      {comparisons.map((c) => (
        <article key={c.angle} className="rounded-2xl border border-border bg-background/60 p-3">
          <header className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-sunset px-2.5 py-1 text-[10px] font-black text-white">
              <ArrowLeftRight className="h-3 w-3" aria-hidden /> {ANGLE_LABEL[c.angle]}
            </span>
            <span className="text-[12px] font-black">{c.deal.hotel.name}</span>
            <span className="text-[11px] text-muted-foreground">{c.deal.destination.name}</span>
            <span
              className={`ms-auto text-[12px] font-black ${c.priceDeltaPerPerson > 0 ? "text-rose-600" : c.priceDeltaPerPerson < 0 ? "text-emerald-600" : "text-muted-foreground"}`}
            >
              {c.priceDeltaPerPerson === 0
                ? "אותו מחיר"
                : `${c.priceDeltaPerPerson > 0 ? "+" : "−"}${ils(c.priceDeltaPerPerson)} לאדם`}
            </span>
          </header>

          <p className="mt-2 rounded-xl bg-muted/60 p-2.5 text-[12px] font-bold">{c.verdict}</p>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-[12px]">
              <caption className="sr-only">
                השוואה בין החבילה הנוכחית ל{ANGLE_LABEL[c.angle]}
              </caption>
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th scope="col" className="p-1.5 text-right font-bold">
                    מדד
                  </th>
                  <th scope="col" className="p-1.5 text-right font-bold">
                    החבילה הזו
                  </th>
                  <th scope="col" className="p-1.5 text-right font-bold">
                    {ANGLE_LABEL[c.angle]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.label} className="border-t border-border/60">
                    <th scope="row" className="p-1.5 text-right font-bold text-muted-foreground">
                      {r.label}
                    </th>
                    <td
                      className={`p-1.5 ${r.advantage === "base" ? "font-black text-emerald-700" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {r.advantage === "base" ? (
                          <Check className="h-3 w-3" aria-label="יתרון" />
                        ) : r.advantage === "equal" ? (
                          <Minus className="h-3 w-3 opacity-40" aria-hidden />
                        ) : null}
                        {r.base}
                      </span>
                    </td>
                    <td
                      className={`p-1.5 ${r.advantage === "other" ? "font-black text-emerald-700" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {r.advantage === "other" ? (
                          <Check className="h-3 w-3" aria-label="יתרון" />
                        ) : r.advantage === "equal" ? (
                          <Minus className="h-3 w-3 opacity-40" aria-hidden />
                        ) : null}
                        {r.other}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link
            to="/deal/$id"
            params={{ id: c.deal.id }}
            className="mt-2 inline-block rounded-xl border border-border px-3 py-1.5 text-[11px] font-black hover:border-primary/50"
          >
            לצפייה בחבילה החלופית
          </Link>
        </article>
      ))}
    </div>
  );
}
