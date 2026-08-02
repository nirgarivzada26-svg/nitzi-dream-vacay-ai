import santoriniImg from "@/assets/dest-santorini.jpg";
import baliImg from "@/assets/dest-bali.jpg";
import maldivesImg from "@/assets/dest-maldives.jpg";
import tokyoImg from "@/assets/dest-tokyo.jpg";
import laplandImg from "@/assets/dest-lapland.jpg";
import amalfiImg from "@/assets/dest-amalfi.jpg";
import dubaiImg from "@/assets/dest-dubai.jpg";

export type TripType =
  | "beach"
  | "adventure"
  | "romantic"
  | "family"
  | "friends"
  | "nightlife"
  | "nature";
export type TripStyle = "chill" | "luxury" | "young" | "smart";

export interface QuizAnswers {
  type: TripType | null;
  destination: string;
  days: number;
  budget: number;
  people: number;
  style: TripStyle | null;
}

export const defaultAnswers: QuizAnswers = {
  type: null,
  destination: "",
  days: 5,
  budget: 5000,
  people: 2,
  style: null,
};

export const tripTypes: { id: TripType; label: string; emoji: string; desc: string }[] = [
  { id: "beach", label: "ים ושמש", emoji: "🏖️", desc: "חופים לבנים ומים טורקיז" },
  { id: "adventure", label: "הרפתקה", emoji: "🏔️", desc: "טרקים, אקסטרים ואדרנלין" },
  { id: "romantic", label: "זוגי", emoji: "💞", desc: "שקיעות ורגעים קסומים" },
  { id: "family", label: "משפחה", emoji: "👨‍👩‍👧", desc: "כיף לכל הגילאים" },
  { id: "friends", label: "חברים", emoji: "🎉", desc: "טיול של חבורה" },
  { id: "nightlife", label: "חיי לילה", emoji: "🌃", desc: "מועדונים, ברים ובילויים" },
  { id: "nature", label: "טבע", emoji: "🌿", desc: "נופים פראיים ושקט" },
];

export const styles: { id: TripStyle; label: string; emoji: string }[] = [
  { id: "chill", label: "רגוע", emoji: "🧘" },
  { id: "luxury", label: "יוקרתי", emoji: "✨" },
  { id: "young", label: "צעיר", emoji: "🕶️" },
  { id: "smart", label: "זול וחכם", emoji: "🎯" },
];

// Destination data lives in the database catalog — see src/lib/catalog.ts.

export const tripPurposes = [
  { id: "any", label: "כל סוג" },
  { id: "beach", label: "🏖️ ים ושמש" },
  { id: "romantic", label: "💞 זוגי" },
  { id: "family", label: "👨‍👩‍👧 משפחה" },
  { id: "adventure", label: "🏔️ הרפתקה" },
  { id: "nightlife", label: "🌃 חיי לילה" },
];
