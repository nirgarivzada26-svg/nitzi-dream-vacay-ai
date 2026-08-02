// Deals layer — a curated "buyable" trip built on top of destinations.
// The UI never fabricates prices: it calls getDeal() / listDeals() and displays
// exactly what the provider returned, along with a verifiedAt timestamp and
// availability status.
//
// Today the provider is deterministic-mock (see nitzi-data). When we swap to
// a real supplier (Booking / Amadeus / Expedia), replace the body of these
// functions — the return shape and Price-Revalidation contract are stable.

import type { Destination } from "./catalog";

export type Availability = "available" | "limited" | "sold-out";

export interface DealPrice {
  perPerson: number;
  total: number;
  currency: "ILS";
  verifiedAt: string; // ISO
  availability: Availability;
  source: string;    // provider id
  ttlSeconds: number; // how long this quote is trusted
}

export interface DealFlight {
  airline: string;
  flightNumber: string;
  departAt: string;
  arriveAt: string;
  stops: number;
  durationMinutes: number;
}

export type BoardBasis = "room-only" | "breakfast" | "half-board" | "all-inclusive";

export const boardLabels: Record<BoardBasis, string> = {
  "room-only": "לינה בלבד",
  breakfast: "ארוחת בוקר",
  "half-board": "חצי פנסיון",
  "all-inclusive": "הכל כלול",
};

export interface Deal {
  id: string; // stable slug (destination name urlencoded)
  destination: Destination;
  title: string;
  board: BoardBasis;
  listPricePerPerson: number; // pre-discount reference price
  discountPct: number;        // 0-100
  freeCancellation: boolean;
  hotel: {
    name: string;
    note: string;
    stars: number;
    guestRating: number;
    reviewsCount: number;
  };
  outbound: DealFlight;
  inbound: DealFlight;
  dates: { start: string; end: string; nights: number };
  people: number;
  price: DealPrice;
  includes: string[];
  excludes: string[];
  cancellation: string;
  gallery: { src: string; alt: string }[];
  attractions: string[];
  restaurants: string[];
  secret?: boolean;
}

// Deterministic pseudo-random from a string seed so a given destination
// always renders the same price/dates within its TTL window.
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

const AIRLINES = [
  { code: "LY", name: "אל על" },
  { code: "IZ", name: "ארקיע" },
  { code: "LH", name: "לופטהנזה" },
  { code: "TK", name: "טורקיש איירליינס" },
  { code: "W6", name: "וויז אייר" },
  { code: "AF", name: "אייר פראנס" },
];

export function dealIdFor(dest: Destination) {
  return dest.slug;
}

/** Returns null when the destination has no supplier content to build an offer from. */
function buildDeal(dest: Destination, opts?: { secret?: boolean; seed?: string }): Deal | null {
  if (!dest.hasOffers || dest.hotels.length === 0) return null;
  const seed = opts?.seed ?? `deal|${dest.slug}`;
  const r = rng(seed);
  const nights = 4 + Math.floor(r() * 4); // 4..7
  const people = 2;

  const start = new Date(Date.now() + (14 + Math.floor(r() * 21)) * 86400000);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + nights * 86400000);

  const airOut = pick(r, AIRLINES);
  const airIn = r() > 0.7 ? pick(r, AIRLINES) : airOut;
  const stopsOut = r() > 0.55 ? 0 : 1;
  const stopsIn = r() > 0.55 ? 0 : 1;
  const durOut = Math.round(dest.flightHours * 60 + stopsOut * (90 + r() * 90));
  const durIn = Math.round(dest.flightHours * 60 + stopsIn * (90 + r() * 90));
  const depOut = new Date(start); depOut.setHours(5 + Math.floor(r() * 12), 15 * Math.floor(r() * 4), 0, 0);
  const arrOut = new Date(depOut.getTime() + durOut * 60000);
  const depIn = new Date(end); depIn.setHours(8 + Math.floor(r() * 10), 15 * Math.floor(r() * 4), 0, 0);
  const arrIn = new Date(depIn.getTime() + durIn * 60000);

  const perPersonBase = dest.avgBudgetPerPerson * (0.78 + r() * 0.18);
  const secretDiscount = opts?.secret ? 0.72 : 1;
  const perPerson = Math.round((perPersonBase * secretDiscount) / 10) * 10;
  const total = perPerson * people;

  const hotel = dest.hotels[Math.floor(r() * dest.hotels.length)];
  const stars = 4 + Math.floor(r() * 2);

  const board: BoardBasis = pick(r, [
    "breakfast", "breakfast", "half-board", "all-inclusive", "all-inclusive", "room-only",
  ] as BoardBasis[]);
  const listPricePerPerson = Math.round((perPerson * (1.12 + r() * 0.26)) / 10) * 10;
  const discountPct = Math.max(0, Math.round((1 - perPerson / listPricePerPerson) * 100));
  const freeCancellation = r() > 0.3;

  return {
    id: dealIdFor(dest),
    destination: dest,
    title: `${nights} לילות ב${dest.name} · ${hotel.name}`,
    board,
    listPricePerPerson,
    discountPct,
    freeCancellation,
    hotel: {
      name: hotel.name,
      note: hotel.note,
      stars,
      guestRating: Number((8.4 + r() * 1.4).toFixed(1)),
      reviewsCount: 240 + Math.floor(r() * 3200),
    },
    outbound: {
      airline: airOut.name,
      flightNumber: `${airOut.code}${100 + Math.floor(r() * 900)}`,
      departAt: depOut.toISOString(),
      arriveAt: arrOut.toISOString(),
      stops: stopsOut,
      durationMinutes: durOut,
    },
    inbound: {
      airline: airIn.name,
      flightNumber: `${airIn.code}${100 + Math.floor(r() * 900)}`,
      departAt: depIn.toISOString(),
      arriveAt: arrIn.toISOString(),
      stops: stopsIn,
      durationMinutes: durIn,
    },
    dates: { start: start.toISOString(), end: end.toISOString(), nights },
    people,
    price: {
      perPerson,
      total,
      currency: "ILS",
      verifiedAt: new Date().toISOString(),
      availability: r() > 0.85 ? "limited" : "available",
      source: "NITZI Verified",
      ttlSeconds: 15 * 60,
    },
    includes: [
      `${nights} לילות ב-${hotel.name} (${stars}★)`,
      "טיסה הלוך-חזור מתל אביב",
      "כבודה 20 ק״ג לאדם",
      "העברות משדה התעופה למלון",
      hotel.note.includes("ברי") || r() > 0.4 ? "ארוחת בוקר כלולה" : "ביטוח מזוודות",
    ],
    excludes: [
      "ביטוח נסיעות (מומלץ בנפרד)",
      "ארוחות שאינן צוינו במפורש",
      "אטרקציות וסיורים מודרכים",
      "פיקדון וחיובים אישיים במלון",
    ],
    cancellation: "ביטול חינם עד 21 ימים לפני היציאה. לאחר מכן חיוב לפי מדיניות הספק.",
    gallery: dest.image ? [{ src: dest.image, alt: `${dest.name} — נוף ראשי` }] : [],
    attractions: dest.attractions,
    restaurants: dest.restaurants,
    secret: opts?.secret,
  };
}

// Simulated Price Revalidation. Real API would call the supplier here and
// return one of: verified (unchanged), changed (new price to confirm),
// sold-out. UI must present changed/sold-out clearly before charging.
export type RevalidationResult =
  | { status: "verified"; deal: Deal }
  | { status: "changed"; deal: Deal; oldPrice: number; newPrice: number }
  | { status: "sold-out"; deal: Deal };

export async function revalidateDeal(deal: Deal): Promise<RevalidationResult> {
  await new Promise((r) => setTimeout(r, 900));
  // ~85% verified, ~12% price change, ~3% sold out
  const roll = Math.random();
  if (roll < 0.85) {
    return { status: "verified", deal: { ...deal, price: { ...deal.price, verifiedAt: new Date().toISOString() } } };
  }
  if (roll < 0.97) {
    const delta = Math.round(deal.price.perPerson * (0.03 + Math.random() * 0.08));
    const newPer = deal.price.perPerson + delta;
    return {
      status: "changed",
      oldPrice: deal.price.total,
      newPrice: newPer * deal.people,
      deal: {
        ...deal,
        price: { ...deal.price, perPerson: newPer, total: newPer * deal.people, verifiedAt: new Date().toISOString() },
      },
    };
  }
  return { status: "sold-out", deal: { ...deal, price: { ...deal.price, availability: "sold-out", verifiedAt: new Date().toISOString() } } };
}

/** All bookable deals from the catalog. `variants` > 1 produces several
 *  distinct offers per destination (different hotel / dates / board). */
export function listDeals(catalog: Destination[], variants = 1): Deal[] {
  const out: Deal[] = [];
  for (const d of catalog) {
    for (let v = 0; v < variants; v++) {
      const deal = buildDeal(d, { seed: v === 0 ? `deal|${d.slug}` : `deal|${d.slug}|v${v}` });
      if (!deal) break;
      out.push(v === 0 ? deal : { ...deal, id: `${d.slug}~v${v}` });
    }
  }
  return out;
}

export function getDeal(id: string, catalog: Destination[]): Deal | null {
  const raw = decodeURIComponent(id);
  const [slugPart, variantPart] = raw.split("~v");
  const dest = catalog.find((d) => d.slug === slugPart);
  if (!dest) return null;
  const v = variantPart ? Number(variantPart) : 0;
  const deal = buildDeal(dest, { seed: v ? `deal|${dest.slug}|v${v}` : `deal|${dest.slug}` });
  if (!deal) return null;
  return v ? { ...deal, id: `${dest.slug}~v${v}` } : deal;
}

// Secret deal rotates every 6 hours. Deterministic per slot so all viewers see
// the same secret deal until the next rotation.
const SECRET_ROTATION_HOURS = 6;
export function getSecretDeal(
  catalog: Destination[],
): { deal: Deal; nextRotationAt: Date } | null {
  const bookable = catalog.filter((d) => d.hasOffers && d.hotels.length > 0);
  if (bookable.length === 0) return null;
  const slotMs = SECRET_ROTATION_HOURS * 3600 * 1000;
  const slot = Math.floor(Date.now() / slotMs);
  const dest = bookable[slot % bookable.length];
  const deal = buildDeal(dest, { secret: true, seed: `secret|${dest.slug}|${slot}` });
  if (!deal) return null;
  return { deal, nextRotationAt: new Date((slot + 1) * slotMs) };
}
