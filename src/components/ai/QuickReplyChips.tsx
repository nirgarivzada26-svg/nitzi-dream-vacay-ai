// Optional shortcuts only. Clicking a chip calls the exact same submit(text)
// path a typed message would — nothing here is a separate/hidden code path,
// and nothing here ever prevents free-text input. Only one group renders at
// a time (the first slot that's still unset), matching a fixed, small,
// non-invented list — never a resurrected step-by-step questionnaire.

import type { KnownPreferences } from "@/lib/agent/agent-types";

interface ChipGroup {
  id: string;
  chips: { label: string; text: string }[];
}

const COMPANIONS: ChipGroup = {
  id: "companions",
  chips: [
    { label: "זוג", text: "אנחנו זוג" },
    { label: "משפחה", text: "אנחנו משפחה" },
    { label: "חברים", text: "אנחנו חבורת חברים" },
  ],
};
const FLIGHT: ChipGroup = {
  id: "flight",
  chips: [
    { label: "ישירה בלבד", text: "רק טיסה ישירה" },
    { label: "קונקשן אפשרי", text: "קונקשן בסדר אם זה חוסך" },
  ],
};
const BOARD: ChipGroup = {
  id: "board",
  chips: [
    { label: "ארוחת בוקר", text: "ארוחת בוקר" },
    { label: "הכל כלול", text: "הכל כלול" },
    { label: "לא משנה", text: "בסיס האירוח לא משנה לי" },
  ],
};

function nextChipGroup(known: KnownPreferences | null): ChipGroup | null {
  if (!known) return COMPANIONS;
  const hasCompanionInfo = !!known.tripType || !!known.people;
  if (!hasCompanionInfo) return COMPANIONS;
  if (known.directOnly === null) return FLIGHT;
  if (!known.board) return BOARD;
  return null;
}

export function QuickReplyChips({
  known,
  onPick,
}: {
  known: KnownPreferences | null;
  onPick: (text: string) => void;
}) {
  const group = nextChipGroup(known);
  if (!group) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6" role="group" aria-label="תשובות מהירות">
      <div className="flex flex-wrap gap-1.5 pb-1">
        {group.chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onPick(c.text)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-bold text-foreground transition hover:border-primary hover:text-primary"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
