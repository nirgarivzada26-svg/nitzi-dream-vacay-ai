// Cancellation policy — single source of truth.
//
// One deterministic draw produces the structured policy; `freeCancellation`
// is DERIVED from that same policy, never rolled independently, so the two
// can never disagree (this replaces a real bug: the old code rolled
// `freeCancellation` randomly but always displayed hardcoded "free
// cancellation" text regardless of the roll).
//
// Every customer-facing surface (deal page, checkout, booking request, AI
// recommendation card, DealCard, comparison) must render this policy through
// the shared formatters below — never invent its own cancellation copy.
//
// When a real hotel/flight supplier is connected, its rate-rule response
// should map into this same CancellationPolicy shape.

export type CancellationPolicy =
  | { kind: "free" }
  | { kind: "free_until"; deadlineDaysBeforeDeparture: number }
  | { kind: "partial"; refundPct: number; deadlineDaysBeforeDeparture: number }
  | { kind: "non_refundable" }
  | { kind: "unknown" };

/** Derived from the policy itself — never an independent roll. */
export function isFreeCancellation(policy: CancellationPolicy): boolean {
  return policy.kind === "free" || policy.kind === "free_until";
}

/**
 * Deterministic policy draw from the same seeded RNG the rest of `buildDeal`
 * already uses. Roughly mirrors the previous ~70/30 free/not-free split,
 * while now also representing partial-refund and not-yet-verified states
 * instead of collapsing everything into a binary.
 */
export function derivePolicy(r: () => number): CancellationPolicy {
  const roll = r();
  if (roll < 0.1) return { kind: "free" };
  if (roll < 0.55) {
    return { kind: "free_until", deadlineDaysBeforeDeparture: 14 + Math.floor(r() * 15) }; // 14–28
  }
  if (roll < 0.7) {
    const refundOptions = [50, 70, 80];
    return {
      kind: "partial",
      refundPct: refundOptions[Math.floor(r() * refundOptions.length)],
      deadlineDaysBeforeDeparture: 7 + Math.floor(r() * 8), // 7–14
    };
  }
  if (roll < 0.85) return { kind: "non_refundable" };
  return { kind: "unknown" };
}

function deadlineDate(departureISO: string, daysBefore: number): Date {
  return new Date(new Date(departureISO).getTime() - daysBefore * 86400000);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "short" });
}

/** Short, concise wording — safe for cards (DealCard, AI recommendation card). */
export function cancellationSummary(policy: CancellationPolicy, departureISO: string): string {
  switch (policy.kind) {
    case "free":
      return "ביטול חינם בכל שלב";
    case "free_until":
      return `ביטול חינם עד ${fmtDate(deadlineDate(departureISO, policy.deadlineDaysBeforeDeparture))}`;
    case "partial":
      return `החזר חלקי (${policy.refundPct}%) עד ${fmtDate(deadlineDate(departureISO, policy.deadlineDaysBeforeDeparture))}`;
    case "non_refundable":
      return "לא ניתן לביטול (ללא החזר)";
    case "unknown":
      return "מדיניות ביטול טרם אומתה מול הספק";
  }
}

/** Fuller wording — deal page / booking-request / checkout. */
export function cancellationDetail(policy: CancellationPolicy, departureISO: string): string {
  switch (policy.kind) {
    case "free":
      return "ניתן לבטל בכל שלב ללא עלות וללא קנס.";
    case "free_until":
      return `ביטול חינם וללא עלות עד ${fmtDate(deadlineDate(departureISO, policy.deadlineDaysBeforeDeparture))}. לאחר מועד זה תחול מדיניות הספק.`;
    case "partial":
      return `ביטול עד ${fmtDate(deadlineDate(departureISO, policy.deadlineDaysBeforeDeparture))} מזכה בהחזר של ${policy.refundPct}% מהתשלום. לאחר מועד זה לא יינתן החזר.`;
    case "non_refundable":
      return "חבילה זו אינה ניתנת לביטול ואינה מזכה בהחזר כספי, מכל סיבה שהיא.";
    case "unknown":
      return "מדיניות הביטול המדויקת טרם אומתה מול הספק. הפרטים הסופיים יימסרו לפני אישור ההזמנה.";
  }
}
