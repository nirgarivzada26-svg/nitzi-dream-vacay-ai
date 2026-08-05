// Slice 3.6 — the closing concierge message.
//
// "אם זו הייתה החופשה שלי, הייתי בוחר בדיל הזה בגלל…" is produced only when at
// least two structured reasons exist. Otherwise the UI shows an honest note
// instead of a persuasive sentence.

import type { Deal } from "../deals";
import { boardLabels } from "../deals";
import { topExperiences } from "./experience";
import { audienceFor } from "./audience";
import { inBestSeason } from "./weather";

export const NO_MESSAGE =
  "אין מספיק נתונים מאומתים כדי לנסח המלצה אישית על הדיל הזה.";

export interface ConciergeMessage {
  headline: string;
  reasons: { text: string; source: string }[];
  caveat: string | null;
}

export function conciergeMessage(deal: Deal, peers: Deal[]): ConciergeMessage | null {
  const dest = deal.destination;
  const reasons: { text: string; source: string }[] = [];

  if (deal.outbound.stops === 0 && deal.inbound.stops === 0)
    reasons.push({
      text: "הטיסות ישירות לשני הכיוונים — בלי החלפות ובלי זמן מבוזבז",
      source: "פרטי הטיסה בהצעה",
    });

  if (deal.hotel.stars >= 4 || deal.hotel.guestRating >= 8.5)
    reasons.push({
      text: `המלון מדורג ${deal.hotel.stars}★ עם ציון אורחים ${deal.hotel.guestRating} מתוך ${deal.hotel.reviewsCount.toLocaleString("he-IL")} ביקורות`,
      source: "פרטי המלון בהצעה",
    });

  if (deal.board !== "room-only")
    reasons.push({
      text: `בסיס האירוח הוא ${boardLabels[deal.board]}, כך שחלק מההוצאה היומית כבר סגורה מראש`,
      source: "שדה board בהצעה",
    });

  const samePeers = peers.filter(
    (p) => p.id !== deal.id && p.destination.slug === dest.slug,
  );
  if (samePeers.length >= 2) {
    const avg =
      samePeers.reduce((s, p) => s + p.price.perPerson, 0) / samePeers.length;
    if (deal.price.perPerson < avg * 0.95)
      reasons.push({
        text: `המחיר נמוך בכ-${Math.round(((avg - deal.price.perPerson) / avg) * 100)}% מהממוצע של ${samePeers.length} הצעות מאומתות אחרות לאותו יעד`,
        source: "השוואת הצעות מאומתות",
      });
  }

  const season = inBestSeason(dest, deal.dates.start);
  if (season === true)
    reasons.push({
      text: "התאריכים נופלים בתוך העונה המומלצת ליעד",
      source: "עמודת best_travel_months בקטלוג",
    });

  const top = topExperiences(deal, 2);
  if (top.length === 2)
    reasons.push({
      text: `החוזקות הבולטות של החופשה הזו הן ${top[0].label} ו${top[1].label}`,
      source: "פרופיל החוויה מבוסס הקטלוג",
    });

  if (deal.freeCancellation)
    reasons.push({
      text: "הביטול חינם, כך שאפשר לסגור עכשיו ולשקול שוב בהמשך",
      source: "מדיניות הביטול בהצעה",
    });

  if (reasons.length < 2) return null;

  const { fits, avoid } = audienceFor(deal);
  const caveat =
    avoid.length > 0 ? `שווה לשים לב: פחות מתאים ל${avoid[0].label} — ${avoid[0].reason}.` : null;

  const who = fits.length > 0 ? ` אם אתם ${fits.slice(0, 2).map((f) => f.label).join(" או ")},` : "";

  return {
    headline: `אם זו הייתה החופשה שלי,${who} הייתי בוחר בדיל הזה בגלל:`,
    reasons: reasons.slice(0, 5),
    caveat,
  };
}
