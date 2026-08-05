// Slice 3.6 — who this trip fits, and who should skip it.
// Every entry cites the structured field that produced it. No field, no claim.

import type { Deal } from "../deals";
import { boardLabels } from "../deals";

export interface AudienceFlag {
  key: string;
  label: string;
  reason: string;
  source: string;
}

export interface AudienceVerdict {
  fits: AudienceFlag[];
  avoid: AudienceFlag[];
}

export function audienceFor(deal: Deal): AudienceVerdict {
  const dest = deal.destination;
  const tags = new Set<string>([...dest.travelCategories, ...(dest.matches as string[])]);
  const fits: AudienceFlag[] = [];
  const avoid: AudienceFlag[] = [];

  const add = (
    to: AudienceFlag[],
    key: string,
    label: string,
    reason: string,
    source: string,
  ) => to.push({ key, label, reason, source });

  if (tags.has("romantic"))
    add(fits, "couples", "זוגות", "היעד מסווג בקטלוג כיעד רומנטי", "travel_categories / matches");
  if (tags.has("romantic") && deal.hotel.stars >= 4)
    add(fits, "honeymoon", "ירח דבש", `יעד רומנטי עם מלון ${deal.hotel.stars}★`, "travel_categories + דירוג המלון");
  if (tags.has("family"))
    add(fits, "families", "משפחות", "היעד מסווג בקטלוג כיעד משפחתי", "travel_categories / matches");
  if (tags.has("friends") || tags.has("nightlife"))
    add(fits, "friends", "חברים", "היעד מסווג לחבורות או לחיי לילה", "travel_categories / matches");
  if (tags.has("nightlife"))
    add(fits, "nightlife", "חיי לילה", "היעד מסווג בקטלוג כיעד חיי לילה", "travel_categories");
  if (tags.has("beach") || tags.has("island") || deal.board === "all-inclusive")
    add(
      fits,
      "relax",
      "נופש ורגיעה",
      tags.has("beach") || tags.has("island")
        ? "יעד חוף/אי בקטלוג"
        : `בסיס אירוח ${boardLabels[deal.board]}`,
      "travel_categories / board",
    );
  if (deal.hotel.stars >= 5 || tags.has("luxury"))
    add(fits, "luxury", "יוקרה", `מלון ${deal.hotel.stars}★ בהצעה`, "דירוג המלון בהצעה");
  if (dest.avgBudgetPerPerson > 0 && deal.price.perPerson <= dest.avgBudgetPerPerson * 0.8)
    add(
      fits,
      "budget",
      "תקציב חסכוני",
      "המחיר לאדם נמוך ב-20% ומעלה מהתקציב הממוצע ליעד",
      "avg_budget_per_person מול מחיר ההצעה",
    );

  // --- who should skip it -------------------------------------------------
  if (dest.flightHours >= 7)
    add(
      avoid,
      "babies",
      "משפחות עם תינוקות",
      `טיסה של ${dest.flightHours} שעות לכיוון`,
      "flight_hours בקטלוג",
    );
  if (deal.outbound.stops > 0 || deal.inbound.stops > 0)
    add(
      avoid,
      "mobility",
      "נוסעים עם ניידות מוגבלת",
      "המסלול כולל עצירת ביניים והחלפת מטוס",
      "פרטי הטיסה בהצעה",
    );
  if (tags.has("nightlife") && tags.has("family") === false && !tags.has("nature"))
    add(
      avoid,
      "quiet",
      "מחפשי שקט",
      "היעד מסווג כיעד חיי לילה בלבד",
      "travel_categories",
    );
  if (!tags.has("nightlife"))
    add(avoid, "party", "מחפשי חיי לילה", "היעד אינו מסווג בקטלוג כיעד חיי לילה", "travel_categories");
  if (!tags.has("family") && deal.hotel.stars <= 3)
    add(
      avoid,
      "families-avoid",
      "משפחות עם ילדים קטנים",
      `היעד אינו מסווג כמשפחתי והמלון מדורג ${deal.hotel.stars}★`,
      "travel_categories + דירוג המלון",
    );
  if (dest.avgBudgetPerPerson > 0 && deal.price.perPerson >= dest.avgBudgetPerPerson * 1.2)
    add(
      avoid,
      "tight-budget",
      "תקציב מצומצם",
      "המחיר לאדם גבוה ב-20% ומעלה מהתקציב הממוצע ליעד",
      "avg_budget_per_person מול מחיר ההצעה",
    );

  return { fits, avoid };
}
