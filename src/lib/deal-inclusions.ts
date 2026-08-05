// Structured package inclusions. Each line carries an explicit status so the UI
// never implies that baggage / transfers / insurance are included when the
// package data does not confirm it.

import type { Deal } from "./deals";
import { boardLabels } from "./deals";
import type { FlightAlternative } from "./deal-alternatives";

export type InclusionStatus = "included" | "optional" | "excluded" | "unknown";

export interface InclusionItem {
  key: string;
  label: string;
  status: InclusionStatus;
  note?: string;
}

export const INCLUSION_TEXT: Record<InclusionStatus, string> = {
  included: "כלול",
  optional: "תוספת אופציונלית",
  excluded: "לא כלול",
  unknown: "טעון אישור",
};

export function inclusionsFor(deal: Deal, flight: FlightAlternative): InclusionItem[] {
  return [
    { key: "flights", label: "טיסות הלוך-חזור מתל אביב", status: "included" },
    {
      key: "nights",
      label: `${deal.dates.nights} לילות ב-${deal.hotel.name} (${deal.hotel.stars}★)`,
      status: "included",
    },
    { key: "board", label: `בסיס אירוח: ${boardLabels[deal.board]}`, status: "included" },
    {
      key: "carry-on",
      label: "כבודת יד",
      status: flight.carryOnIncluded ? "included" : "optional",
    },
    {
      key: "checked",
      label: flight.checkedBagKg ? `מזוודה ${flight.checkedBagKg} ק״ג` : "מזוודה למטען",
      status: flight.checkedBagIncluded ? "included" : "optional",
      note: flight.checkedBagIncluded ? undefined : "ניתן להוסיף בתשלום מול חברת התעופה",
    },
    { key: "transfer", label: "העברות משדה התעופה למלון", status: "optional" },
    { key: "insurance", label: "ביטוח נסיעות", status: "excluded" },
    { key: "taxes", label: "מסי נמל ומסי טיסה", status: "included" },
    {
      key: "resort-fee",
      label: "דמי נופש (Resort fee) במלון",
      status: "unknown",
      note: "נגבים ישירות במלון אם קיימים",
    },
    { key: "support", label: "תמיכת NITZI לאורך ההזמנה", status: "included" },
  ];
}
