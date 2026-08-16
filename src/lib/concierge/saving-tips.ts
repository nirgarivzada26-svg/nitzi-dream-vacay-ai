// Slice 3.6 — cost-saving tips derived from real peer offers on the same
// destination. Each tip states the exact delta between two priced offers; if no
// peer supports a tip, it is simply not produced.

import type { Deal } from "../deals";
import { boardLabels } from "../deals";

export interface SavingTip {
  key: string;
  title: string;
  detail: string;
  deltaIls: number; // negative = saving, positive = extra cost
  dealId: string;
  source: string;
}

const ils = (n: number) => `₪${Math.abs(Math.round(n)).toLocaleString("he-IL")}`;

export function savingTips(deal: Deal, peers: Deal[], limit = 5): SavingTip[] {
  const same = peers.filter(
    (p) => p.id !== deal.id && p.destination.slug === deal.destination.slug,
  );
  const tips: SavingTip[] = [];
  const base = deal.price.perPerson;

  const cheaperDate = same
    .filter((p) => p.dates.nights === deal.dates.nights && p.dates.start !== deal.dates.start)
    .sort((a, b) => a.price.perPerson - b.price.perPerson)[0];
  if (cheaperDate && cheaperDate.price.perPerson < base)
    tips.push({
      key: "dates",
      title: "שינוי תאריכים",
      detail: `יציאה ב-${cheaperDate.dates.start} באותו מספר לילות זולה ב-${ils(
        base - cheaperDate.price.perPerson,
      )} לאדם.`,
      deltaIls: cheaperDate.price.perPerson - base,
      dealId: cheaperDate.id,
      source: "השוואת הצעות מאומתות באותו יעד",
    });

  const board = same
    .filter((p) => p.board !== deal.board && p.dates.nights === deal.dates.nights)
    .sort((a, b) => a.price.perPerson - b.price.perPerson)[0];
  if (board)
    tips.push({
      key: "board",
      title: `בסיס אירוח ${boardLabels[board.board]}`,
      detail:
        board.price.perPerson < base
          ? `מעבר מ-${boardLabels[deal.board]} ל-${boardLabels[board.board]} חוסך ${ils(
              base - board.price.perPerson,
            )} לאדם.`
          : `שדרוג ל-${boardLabels[board.board]} עולה ${ils(
              board.price.perPerson - base,
            )} נוספים לאדם.`,
      deltaIls: board.price.perPerson - base,
      dealId: board.id,
      source: "השוואת הצעות מאומתות באותו יעד",
    });

  const anyStop = deal.outbound.stops > 0 || deal.inbound.stops > 0;
  const direct = same
    .filter((p) => p.outbound.stops === 0 && p.inbound.stops === 0)
    .sort((a, b) => a.price.perPerson - b.price.perPerson)[0];
  if (direct && anyStop)
    tips.push({
      key: "direct",
      title: "טיסה ישירה",
      detail: `הצעה עם טיסה ישירה ${
        direct.price.perPerson > base
          ? `עולה ${ils(direct.price.perPerson - base)} נוספים לאדם`
          : `זולה ב-${ils(base - direct.price.perPerson)} לאדם`
      }.`,
      deltaIls: direct.price.perPerson - base,
      dealId: direct.id,
      source: "השוואת הצעות מאומתות באותו יעד",
    });

  const nights = same
    .filter((p) => p.dates.nights !== deal.dates.nights)
    .sort((a, b) => a.price.perPerson / a.dates.nights - b.price.perPerson / b.dates.nights)[0];
  if (nights) {
    const basePerNight = base / Math.max(1, deal.dates.nights);
    const altPerNight = nights.price.perPerson / Math.max(1, nights.dates.nights);
    if (altPerNight < basePerNight)
      tips.push({
        key: "nights",
        title: `${nights.dates.nights} לילות במקום ${deal.dates.nights}`,
        detail: `עלות הלילה יורדת מ-${ils(basePerNight)} ל-${ils(altPerNight)} לאדם.`,
        deltaIls: nights.price.perPerson - base,
        dealId: nights.id,
        source: "השוואת הצעות מאומתות באותו יעד",
      });
  }

  return tips.slice(0, limit);
}
