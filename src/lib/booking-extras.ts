// Paid extras catalog — the single source of truth for both the checkout UI
// and the server-side price recomputation. Prices must never be trusted from
// the browser, so the server reads them from here too.

export type ExtraId = "bag" | "trolley" | "seat" | "insurance" | "transfers" | "meals";

export interface ExtraDef {
  id: ExtraId;
  label: string;
  note: string;
  price: number;
  perPerson: boolean;
}

export const EXTRAS: ExtraDef[] = [
  { id: "bag", label: "מזוודה 23 ק״ג", note: "לכיוון הלוך-חזור", price: 150, perPerson: true },
  { id: "trolley", label: "טרולי עלייה למטוס", note: "8 ק״ג", price: 90, perPerson: true },
  { id: "seat", label: "בחירת מושב", note: "מושבים צמודים בטיסה", price: 120, perPerson: true },
  {
    id: "insurance",
    label: "ביטוח נסיעות",
    note: "כולל כיסוי רפואי וביטולים",
    price: 120,
    perPerson: true,
  },
  {
    id: "transfers",
    label: "העברות שדה תעופה–מלון",
    note: "כלול בחבילה",
    price: 0,
    perPerson: false,
  },
  { id: "meals", label: "שדרוג ארוחות", note: "חצי פנסיון במלון", price: 240, perPerson: true },
];

export const EXTRA_IDS = EXTRAS.map((e) => e.id) as [ExtraId, ...ExtraId[]];

export interface ExtraLine {
  id: ExtraId;
  label: string;
  amount: number;
}

/** Deterministic extras pricing. Same function runs on the client and the server. */
export function computeExtras(
  selected: ExtraId[],
  people: number,
): { lines: ExtraLine[]; total: number } {
  const set = new Set(selected);
  const lines = EXTRAS.filter((e) => set.has(e.id) && e.price > 0).map((e) => ({
    id: e.id,
    label: e.label,
    amount: e.perPerson ? e.price * Math.max(1, people) : e.price,
  }));
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
