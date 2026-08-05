// Slice 3.6 — complete travel-experience profile.
// Twelve independent dimensions. Each one is scored ONLY from structured
// catalog/offer fields; a dimension with no supporting field returns null and
// the UI prints "אין נתונים מאומתים" instead of a number.

import type { Destination } from "../catalog";
import type { Deal } from "../deals";

export const NO_EXPERIENCE_DATA = "אין נתונים מאומתים";

export interface ExperienceDimension {
  key: string;
  label: string;
  value: number | null;
  basis: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function tagScore(dest: Destination, keys: string[]): { hits: number; total: number } {
  const tags = new Set<string>([...dest.travelCategories, ...(dest.matches as string[])]);
  const hits = keys.filter((k) => tags.has(k)).length;
  return { hits, total: keys.length };
}

function fromTags(
  dest: Destination,
  key: string,
  label: string,
  keys: string[],
  bonus = 0,
  bonusBasis = "",
): ExperienceDimension {
  const { hits } = tagScore(dest, keys);
  if (hits === 0 && bonus === 0)
    return { key, label, value: null, basis: `${NO_EXPERIENCE_DATA} (travel_categories)` };
  return {
    key,
    label,
    value: clamp(50 + hits * 25 + bonus),
    basis: [
      hits > 0 ? `סיווגי היעד: ${keys.filter((k) => tagScore(dest, [k]).hits).join(", ")}` : null,
      bonus !== 0 ? bonusBasis : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export function experienceProfile(deal: Deal): ExperienceDimension[] {
  const dest = deal.destination;
  const stars = deal.hotel.stars;
  const rating = deal.hotel.guestRating;
  const budgetGap =
    dest.avgBudgetPerPerson > 0 ? deal.price.perPerson / dest.avgBudgetPerPerson : null;

  return [
    fromTags(
      dest,
      "relax",
      "רוגע ונופש",
      ["beach", "island", "spa"],
      deal.board === "all-inclusive" ? 15 : 0,
      "בסיס אירוח הכל כלול",
    ),
    dest.restaurants.length > 0
      ? {
          key: "food",
          label: "אוכל",
          value: clamp(50 + dest.restaurants.length * 8),
          basis: `${dest.restaurants.length} מסעדות מתועדות בקטלוג`,
        }
      : fromTags(dest, "food", "אוכל", ["food", "culinary"]),
    fromTags(dest, "nightlife", "חיי לילה", ["nightlife", "friends"]),
    fromTags(dest, "beach", "חופים", ["beach", "island"]),
    dest.attractions.length > 0
      ? {
          key: "culture",
          label: "תרבות",
          value: clamp(45 + dest.attractions.length * 8),
          basis: `${dest.attractions.length} אטרקציות מתועדות בקטלוג`,
        }
      : fromTags(dest, "culture", "תרבות", ["city", "culture", "history"]),
    fromTags(dest, "shopping", "קניות", ["shopping", "city"]),
    fromTags(dest, "nature", "טבע", ["nature", "mountains", "ski"]),
    fromTags(
      dest,
      "families",
      "משפחות",
      ["family"],
      stars >= 4 ? 10 : 0,
      `מלון ${stars}★`,
    ),
    fromTags(
      dest,
      "couples",
      "זוגות",
      ["romantic"],
      rating >= 8.5 ? 10 : 0,
      `דירוג אורחים ${rating}`,
    ),
    stars > 0
      ? {
          key: "luxury",
          label: "יוקרה",
          value: clamp(stars * 18 + (rating >= 9 ? 8 : 0)),
          basis: `דירוג המלון ${stars}★, דירוג אורחים ${rating}`,
        }
      : { key: "luxury", label: "יוקרה", value: null, basis: NO_EXPERIENCE_DATA },
    budgetGap !== null
      ? {
          key: "budget",
          label: "משתלמות",
          value: clamp(100 - (budgetGap - 0.6) * 110),
          basis: "מחיר ההצעה מול avg_budget_per_person ביעד",
        }
      : { key: "budget", label: "משתלמות", value: null, basis: NO_EXPERIENCE_DATA },
    fromTags(dest, "adventure", "הרפתקה", ["adventure", "nature", "ski", "diving"]),
  ];
}

export function topExperiences(deal: Deal, n = 3): ExperienceDimension[] {
  return experienceProfile(deal)
    .filter((d): d is ExperienceDimension & { value: number } => d.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
