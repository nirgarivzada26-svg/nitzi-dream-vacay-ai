// Slice 3 — explicit verification states for every deal.
//
// The old UI labelled deterministic demo offers as "מחיר נבדק ואומת", which is
// misleading. A deal now carries a `mode` (demo / catalog / live) and the UI
// derives one of five explicit states from it. Demo data can never render a
// live-verified badge.

import type { Deal } from "./deals";

export type VerificationState =
  | "verified_live"
  | "verified_catalog"
  | "demo"
  | "stale"
  | "unavailable";

export type VerificationTone = "positive" | "neutral" | "warning" | "critical";

export interface VerificationPresentation {
  state: VerificationState;
  /** Short label, always paired with an icon + text (never colour alone). */
  label: string;
  detail: string;
  tone: VerificationTone;
  bookable: boolean;
}

export const VERIFICATION_TEXT: Record<VerificationState, { label: string; detail: string }> = {
  verified_live: {
    label: "מחיר וזמינות אומתו מול הספק",
    detail: "הספק החזיר מחיר וזמינות בזמן אמת עבור התאריכים שנבחרו.",
  },
  verified_catalog: {
    label: "נבדק מול קטלוג NITZI",
    detail: "המחיר מבוסס על נתוני הקטלוג של NITZI ויאומת מול הספק לפני אישור ההזמנה.",
  },
  demo: {
    label: "נתוני הדגמה — המחיר והזמינות יאומתו לפני ההזמנה",
    detail: "החבילה מוצגת במצב הדגמה. לא מתבצע חיוב ולא נשלחת הזמנה לספק בשלב זה.",
  },
  stale: {
    label: "נדרש אימות מחיר מחדש",
    detail: "עברו יותר מדי דקות מאז האימות האחרון. יש לרענן כדי לקבל מחיר עדכני.",
  },
  unavailable: {
    label: "החבילה אינה זמינה כרגע",
    detail: "הספק לא מאשר זמינות לתאריכים אלה. אפשר לבחור תאריכים אחרים או חבילה דומה.",
  },
};

const TONES: Record<VerificationState, VerificationTone> = {
  verified_live: "positive",
  verified_catalog: "positive",
  demo: "neutral",
  stale: "warning",
  unavailable: "critical",
};

export function verificationStateFor(deal: Deal, now: number = Date.now()): VerificationState {
  const p = deal.price;
  if (p.availability === "sold-out") return "unavailable";
  const mode = p.mode ?? "demo";
  if (mode === "demo") return "demo";
  const fresh =
    !!p.verifiedAt && now - new Date(p.verifiedAt).getTime() < Math.max(1, p.ttlSeconds) * 1000;
  if (!fresh) return "stale";
  return mode === "live" ? "verified_live" : "verified_catalog";
}

export function isBookable(state: VerificationState): boolean {
  return state !== "unavailable";
}

export function verificationFor(deal: Deal, now: number = Date.now()): VerificationPresentation {
  const state = verificationStateFor(deal, now);
  return {
    state,
    ...VERIFICATION_TEXT[state],
    tone: TONES[state],
    bookable: isBookable(state),
  };
}

/** Tailwind classes per tone — always accompanied by the textual label. */
export const TONE_CLASS: Record<VerificationTone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  neutral: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900",
};
