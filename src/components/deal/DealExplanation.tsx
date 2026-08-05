import { useId, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { explainDeal } from "@/lib/deal-explanation";

export function DealExplanation({
  deal,
  peers = [],
  defaultOpen = false,
  title = "למה NITZI בחרה בדיל הזה?",
}: {
  deal: Deal;
  peers?: Deal[];
  defaultOpen?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const ex = explainDeal(deal, peers);

  return (
    <section className="rounded-3xl border border-border/70 bg-card/85 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-2 rounded-3xl px-5 py-4 text-right"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-sunset text-white">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-black text-foreground">{title}</span>
        <ChevronDown
          className={`ms-auto h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div id={id} className="space-y-3 px-5 pb-5">
          {!ex.hasEnoughData ? (
            <p className="rounded-2xl bg-muted p-3 text-sm font-semibold text-muted-foreground">
              {ex.fallback}
            </p>
          ) : (
            ex.sections.map((s) => (
              <div key={s.key} className="rounded-2xl border border-border/60 bg-background/60 p-3">
                <h4 className="text-[12px] font-black text-foreground">{s.title}</h4>
                <ul className="mt-1.5 space-y-1">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[12px] leading-relaxed text-foreground">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
