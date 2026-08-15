import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { KnownPreferences } from "@/lib/agent/agent-types";
import { boardLabels } from "@/lib/deals";
import { styles, tripTypes } from "@/lib/nitzi-data";

interface KnownItem {
  key: keyof KnownPreferences;
  label: string;
  /** Extra note shown under a context-only item — never implies it filtered results. */
  contextOnly?: string;
}

const BOARD_LABEL = boardLabels;
const TRIP_TYPE_LABEL = Object.fromEntries(tripTypes.map((t) => [t.id, t.label]));
const STYLE_LABEL = Object.fromEntries(styles.map((s) => [s.id, s.label]));
const FLEXIBILITY_LABEL: Record<string, string> = {
  fixed: "תאריכים קבועים",
  flexible: "גמיש בכמה ימים",
  "very-flexible": "גמיש לגמרי",
};
const BAGGAGE_LABEL: Record<string, string> = {
  checked: "כבודה מוצהרת",
  "carry-on-only": "רק תיק יד",
};

function itemsFrom(known: KnownPreferences): KnownItem[] {
  const items: KnownItem[] = [];
  if (known.destinations?.length)
    items.push({ key: "destinations", label: known.destinations.join(", ") });
  if (known.countries?.length) items.push({ key: "countries", label: known.countries.join(", ") });
  if (known.requestedDates)
    items.push({
      key: "requestedDates",
      label: known.requestedDates,
      contextOnly: "לשיחה בלבד — לא מסנן תוצאות (אין מלאי לפי חודש)",
    });
  if (known.dateFlexibility)
    items.push({
      key: "dateFlexibility",
      label: FLEXIBILITY_LABEL[known.dateFlexibility] ?? known.dateFlexibility,
      contextOnly: "לשיחה בלבד — לא מסנן תוצאות",
    });
  if (known.people) items.push({ key: "people", label: `${known.people} נוסעים` });
  if (known.childrenAges?.length)
    items.push({
      key: "childrenAges",
      label: `ילדים בגילאי ${known.childrenAges.join(", ")}`,
      contextOnly: "לשיחה בלבד — לא מסנן תוצאות (אין הפרדת מלאי לפי גיל)",
    });
  if (known.maxBudgetPerPerson)
    items.push({
      key: "maxBudgetPerPerson",
      label: `עד ₪${known.maxBudgetPerPerson.toLocaleString()} לאדם`,
    });
  if (known.minStars) items.push({ key: "minStars", label: `${known.minStars}★ ומעלה` });
  if (known.board) items.push({ key: "board", label: BOARD_LABEL[known.board] });
  if (known.directOnly !== null)
    items.push({ key: "directOnly", label: known.directOnly ? "טיסה ישירה בלבד" : "קונקשן אפשרי" });
  if (known.baggagePreference)
    items.push({
      key: "baggagePreference",
      label: BAGGAGE_LABEL[known.baggagePreference] ?? known.baggagePreference,
      contextOnly: "20 ק״ג כלולים כברירת מחדל בכל חבילה; לא מסנן תוצאות",
    });
  if (known.musts?.includes("beach")) items.push({ key: "musts", label: "ליד הים" });
  if (known.tripType === "nightlife") items.push({ key: "tripType", label: "חיי לילה" });
  else if (known.tripType)
    items.push({ key: "tripType", label: TRIP_TYPE_LABEL[known.tripType] ?? known.tripType });
  if (known.style) items.push({ key: "style", label: STYLE_LABEL[known.style] ?? known.style });
  return items;
}

export function KnowledgePanel({
  known,
  onRemove,
}: {
  known: KnownPreferences | null;
  onRemove: (label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (!known) return null;
  const items = itemsFrom(known);
  if (items.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <div className="rounded-2xl border border-border/60 bg-muted/30">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[11px] font-black text-muted-foreground sm:hidden"
        >
          מה NITZI כבר יודע ({items.length})
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div
          className={`flex flex-wrap items-center gap-1.5 px-3 pb-2.5 pt-2 sm:flex sm:pt-2.5 ${open ? "flex" : "hidden"}`}
        >
          <span className="hidden text-[11px] font-black text-muted-foreground sm:inline">
            מה NITZI יודע:
          </span>
          {items.map((it) => (
            <span
              key={it.key}
              title={it.contextOnly}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                it.contextOnly
                  ? "border-dashed border-muted-foreground/40 text-muted-foreground"
                  : "border-primary/30 bg-primary/5 text-foreground"
              }`}
            >
              {it.label}
              <button
                type="button"
                onClick={() => onRemove(it.label)}
                aria-label={`הסר: ${it.label}`}
                className="grid h-3.5 w-3.5 place-items-center rounded-full hover:bg-foreground/10"
              >
                <X className="h-2.5 w-2.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
