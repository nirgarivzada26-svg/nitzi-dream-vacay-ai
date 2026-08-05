import { CheckCircle2, CircleHelp, PlusCircle, XCircle } from "lucide-react";
import type { InclusionItem, InclusionStatus } from "@/lib/deal-inclusions";
import { INCLUSION_TEXT } from "@/lib/deal-inclusions";

const STYLE: Record<InclusionStatus, { icon: typeof CheckCircle2; cls: string }> = {
  included: { icon: CheckCircle2, cls: "text-emerald-600" },
  optional: { icon: PlusCircle, cls: "text-sky-600" },
  excluded: { icon: XCircle, cls: "text-rose-600" },
  unknown: { icon: CircleHelp, cls: "text-amber-600" },
};

export function DealInclusions({ items }: { items: InclusionItem[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((i) => {
        const s = STYLE[i.status];
        const Icon = s.icon;
        return (
          <li
            key={i.key}
            className="flex items-start gap-2 rounded-2xl border border-border bg-background/60 p-2.5"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.cls}`} aria-hidden />
            <div className="min-w-0">
              <p className="text-[12px] font-black text-foreground">{i.label}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {INCLUSION_TEXT[i.status]}
                {i.note ? ` · ${i.note}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
