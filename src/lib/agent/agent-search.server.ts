// NITZI AI agent — search pipeline (server only).
//
// Every recommendation the agent produces comes out of this module, which
// reads the managed catalog and the existing offers/providers layer and scores
// results with the existing ranking engine. Nothing here invents a hotel, a
// flight, a price or availability: if the catalog has no match we return an
// explicit empty result instead.

import { fetchDestinationRows } from "@/lib/catalog.server";
import { rowToDestination, type Destination } from "@/lib/catalog";
import { boardLabels, getDeal, listDeals, type Deal } from "@/lib/deals";
import { smartPrice } from "@/lib/smart-price";
import { rank, scoreFlight, scoreHotel, scorePackage } from "@/lib/ranking";
import { getProviders } from "@/lib/providers/registry";
import type { Package } from "@/lib/providers/types";
import type { QuizAnswers } from "@/lib/nitzi-data";
import type {
  AgentComparison,
  AgentFilters,
  AgentRecommendation,
  AgentSearchResult,
} from "./agent-types";

const DEAL_VARIANTS = 3;

let catalogCache: { at: number; data: Destination[] } | null = null;

export async function getCatalog(): Promise<Destination[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache.data;
  const rows = await fetchDestinationRows();
  const data = rows.map(rowToDestination);
  catalogCache = { at: Date.now(), data };
  return data;
}

const norm = (s: string) => s.trim().toLowerCase();

function matchesPlace(dest: Destination, needles: string[]): boolean {
  return needles.some((raw) => {
    const n = norm(raw);
    if (!n) return false;
    return (
      norm(dest.slug) === n ||
      norm(dest.name).includes(n) ||
      n.includes(norm(dest.name)) ||
      norm(dest.country).includes(n) ||
      n.includes(norm(dest.country)) ||
      norm(dest.countryCode) === n ||
      norm(dest.region).includes(n)
    );
  });
}

function answersFrom(f: AgentFilters, dest?: Destination): QuizAnswers {
  return {
    type: f.tripType,
    destination: dest?.slug ?? "",
    days: f.nights ?? 5,
    budget: f.maxBudgetPerPerson ?? dest?.avgBudgetPerPerson ?? 6000,
    people: f.people ?? 2,
    style: f.style,
  };
}

function dealToPackage(deal: Deal): Package {
  const perNight = Math.round(deal.price.perPerson / Math.max(1, deal.dates.nights));
  return {
    id: deal.id,
    title: deal.title,
    hotel: {
      id: `${deal.id}-hotel`,
      name: deal.hotel.name,
      stars: deal.hotel.stars,
      guestRating: deal.hotel.guestRating,
      reviewsCount: deal.hotel.reviewsCount,
      pricePerNight: perNight,
      currency: "ILS",
      location: `${deal.destination.name}, ${deal.destination.country}`,
      amenities: [],
      source: deal.price.source,
    },
    flight: {
      id: `${deal.id}-flight`,
      airline: deal.outbound.airline,
      flightNumber: deal.outbound.flightNumber,
      origin: "TLV",
      destination: deal.destination.name,
      departAt: deal.outbound.departAt,
      arriveAt: deal.outbound.arriveAt,
      durationMinutes: deal.outbound.durationMinutes,
      stops: deal.outbound.stops,
      price: Math.round(deal.price.perPerson * 0.4),
      currency: "ILS",
      source: deal.price.source,
    },
    nights: deal.dates.nights,
    totalPrice: deal.price.total,
    separatePrice: deal.listPricePerPerson * deal.people,
    savings: Math.max(0, deal.listPricePerPerson * deal.people - deal.price.total),
    includes: deal.includes,
    rating: deal.hotel.guestRating,
    source: deal.price.source,
  };
}

function reasonsFor(deal: Deal, f: AgentFilters): string[] {
  const out: string[] = [];
  const budget = f.maxBudgetPerPerson;
  if (budget) {
    if (deal.price.perPerson <= budget) {
      out.push(
        `בתוך התקציב: ₪${deal.price.perPerson.toLocaleString()} לאדם מתוך ₪${budget.toLocaleString()}`,
      );
    } else {
      out.push(`מעל התקציב ב-₪${(deal.price.perPerson - budget).toLocaleString()} לאדם`);
    }
  }
  const sp = smartPrice(deal);
  if (sp) out.push(sp.detail);
  if (f.minStars && deal.hotel.stars >= f.minStars)
    out.push(`מלון ${deal.hotel.stars}★ — עומד בדרישה שלך`);
  if (deal.outbound.stops === 0 && deal.inbound.stops === 0) out.push("טיסה ישירה הלוך ושוב");
  if (deal.board === "all-inclusive") out.push("הכל כלול");
  else out.push(`בסיס אירוח: ${boardLabels[deal.board]}`);
  if (deal.discountPct > 0) out.push(`הנחה של ${deal.discountPct}% מהמחיר המחירון`);
  if (deal.freeCancellation) out.push("ביטול חינם");
  if (f.tripType && deal.destination.matches.includes(f.tripType)) {
    out.push(`${deal.destination.name} מתאים לחופשה מסוג זה לפי הקטלוג`);
  }
  if (deal.hotel.guestRating >= 9)
    out.push(`דירוג אורחים ${deal.hotel.guestRating} (${deal.hotel.reviewsCount} ביקורות)`);
  return out.slice(0, 5);
}

function toRecommendation(deal: Deal, f: AgentFilters, score: number): AgentRecommendation {
  const sp = smartPrice(deal);
  return {
    dealId: deal.id,
    kind: "package",
    destination: deal.destination.name,
    destinationSlug: deal.destination.slug,
    country: deal.destination.country,
    emoji: deal.destination.emoji,
    image: deal.destination.image,
    hotelName: deal.hotel.name,
    hotelStars: deal.hotel.stars,
    guestRating: deal.hotel.guestRating,
    board: deal.board,
    nights: deal.dates.nights,
    people: deal.people,
    startDate: deal.dates.start,
    endDate: deal.dates.end,
    pricePerPerson: deal.price.perPerson,
    totalPrice: deal.price.total,
    currency: "ILS",
    availability: deal.price.availability,
    verifiedAt: deal.price.verifiedAt,
    source: deal.price.source,
    freeCancellation: deal.freeCancellation,
    outbound: deal.outbound,
    inbound: deal.inbound,
    nitziScore: score,
    smartPrice: sp
      ? { level: sp.level, label: sp.label, detail: sp.detail, emoji: sp.emoji }
      : null,
    reasons: reasonsFor(deal, f),
    note: null,
  };
}

function passesFilters(deal: Deal, f: AgentFilters): boolean {
  const d = deal.destination;
  if (f.exclude?.length && matchesPlace(d, f.exclude)) return false;
  if (f.destinations?.length && !matchesPlace(d, f.destinations)) return false;
  if (f.countries?.length && !matchesPlace(d, f.countries)) return false;
  if (f.tripType && !d.matches.includes(f.tripType)) return false;
  if (f.minStars && deal.hotel.stars < f.minStars) return false;
  if (f.board && deal.board !== f.board) return false;
  if (f.directOnly && (deal.outbound.stops > 0 || deal.inbound.stops > 0)) return false;
  if (f.nights && Math.abs(deal.dates.nights - f.nights) > 2) return false;
  if (f.maxBudgetPerPerson && deal.price.perPerson > f.maxBudgetPerPerson * 1.15) return false;
  const musts = f.musts ?? [];
  if (musts.includes("all-inclusive") && deal.board !== "all-inclusive") return false;
  if (musts.includes("free-cancellation") && !deal.freeCancellation) return false;
  if (musts.includes("beach") && !d.matches.includes("beach")) return false;
  if (musts.includes("pool") && !/בריכ/.test(`${deal.hotel.note} ${deal.includes.join(" ")}`))
    return false;
  return true;
}

export async function searchTrips(filters: AgentFilters, limit = 5): Promise<AgentSearchResult> {
  const catalog = await getCatalog();
  const deals = listDeals(catalog, DEAL_VARIANTS);
  const matched = deals.filter((d) => passesFilters(d, filters));

  if (matched.length === 0) {
    const anyPlace =
      filters.destinations?.length || filters.countries?.length
        ? catalog.filter((d) =>
            matchesPlace(d, [...(filters.destinations ?? []), ...(filters.countries ?? [])]),
          )
        : [];
    const reason =
      anyPlace.length === 0 && (filters.destinations?.length || filters.countries?.length)
        ? "היעד המבוקש לא קיים בקטלוג של NITZI"
        : anyPlace.length > 0 && anyPlace.every((d) => !d.hasOffers)
          ? "היעד קיים בקטלוג אך אין כרגע חבילות זמינות אליו"
          : "אין חבילה בקטלוג שעומדת בכל התנאים שהוגדרו";
    return { count: 0, filtersUsed: filters, recommendations: [], emptyReason: reason };
  }

  const scored = matched
    .map((deal) => ({
      deal,
      score: scorePackage(dealToPackage(deal), answersFrom(filters, deal.destination)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 8)));

  return {
    count: matched.length,
    filtersUsed: filters,
    recommendations: scored.map(({ deal, score }) => toRecommendation(deal, filters, score)),
    emptyReason: null,
  };
}

/** Combines a real flight + real hotel from the providers when no package exists. */
export async function buildTrip(
  destinationKey: string,
  filters: AgentFilters,
): Promise<AgentSearchResult> {
  const catalog = await getCatalog();
  const dest = catalog.find((d) => matchesPlace(d, [destinationKey]));
  if (!dest) {
    return {
      count: 0,
      filtersUsed: filters,
      recommendations: [],
      emptyReason: "היעד לא קיים בקטלוג של NITZI — אי אפשר להרכיב חופשה אליו",
    };
  }

  const answers = answersFrom(filters, dest);
  const ctx = { answers, destination: dest, origin: "TLV" };
  const { hotels, flights } = getProviders();
  const [hotelList, flightList] = await Promise.all([
    hotels.search(ctx, { limit: 8 }),
    flights.search(ctx, { limit: 8 }),
  ]);

  if (hotelList.length === 0 || flightList.length === 0) {
    return {
      count: 0,
      filtersUsed: filters,
      recommendations: [],
      emptyReason: "הספקים לא החזירו טיסה או מלון זמינים ליעד הזה",
    };
  }

  const prices = flightList.map((f) => f.price);
  const bestHotel =
    rank(
      hotelList.filter((h) => (filters.minStars ? h.stars >= filters.minStars : true)),
      (h) => scoreHotel(h, answers),
    )[0] ?? rank(hotelList, (h) => scoreHotel(h, answers))[0];
  const flightPool = filters.directOnly ? flightList.filter((f) => f.stops === 0) : flightList;
  const bestFlight = rank(flightPool.length ? flightPool : flightList, (f) =>
    scoreFlight(f, answers, prices),
  )[0];

  const nights = answers.days;
  const people = answers.people;
  const perPerson = Math.round((bestHotel.pricePerNight * nights) / people + bestFlight.price);
  const start = new Date(bestFlight.departAt);
  const end = new Date(start.getTime() + nights * 86400000);

  const rec: AgentRecommendation = {
    dealId: null,
    kind: "built",
    destination: dest.name,
    destinationSlug: dest.slug,
    country: dest.country,
    emoji: dest.emoji,
    image: dest.image,
    hotelName: bestHotel.name,
    hotelStars: bestHotel.stars,
    guestRating: bestHotel.guestRating,
    board: "room-only",
    nights,
    people,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    pricePerPerson: perPerson,
    totalPrice: perPerson * people,
    currency: "ILS",
    availability: "available",
    verifiedAt: new Date().toISOString(),
    source: `${bestFlight.source} + ${bestHotel.source}`,
    freeCancellation: false,
    outbound: {
      airline: bestFlight.airline,
      flightNumber: bestFlight.flightNumber,
      departAt: bestFlight.departAt,
      arriveAt: bestFlight.arriveAt,
      stops: bestFlight.stops,
      durationMinutes: bestFlight.durationMinutes,
    },
    inbound: null,
    nitziScore: Math.round(
      (scoreHotel(bestHotel, answers) + scoreFlight(bestFlight, answers, prices)) / 2,
    ),
    smartPrice: null,
    reasons: [
      `מלון ${bestHotel.stars}★ בדירוג ${bestHotel.guestRating} — ₪${bestHotel.pricePerNight.toLocaleString()} ללילה`,
      `טיסה עם ${bestFlight.airline}${bestFlight.stops === 0 ? " ללא עצירות" : ` עם ${bestFlight.stops} עצירות`} — ₪${bestFlight.price.toLocaleString()} לאדם`,
      "אין חבילה מוכנה ליעד הזה, אז הרכבתי טיסה + מלון בנפרד",
    ],
    note: "הרכבה של NITZI מטיסה ומלון נפרדים — המחיר הוא סכום שני המרכיבים, לא חבילה מאושרת של ספק",
  };

  return { count: 1, filtersUsed: filters, recommendations: [rec], emptyReason: null };
}

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString()}`;
}

export async function compareTrips(dealIds: string[]): Promise<AgentComparison> {
  const catalog = await getCatalog();
  const deals = dealIds
    .map((id) => getDeal(id, catalog))
    .filter((d): d is Deal => d !== null)
    .slice(0, 3);

  if (deals.length === 0) {
    return {
      items: [],
      rows: [],
      bestValueDealId: null,
      bestHotelDealId: null,
      cheapestDealId: null,
    };
  }

  const scores = deals.map((d) =>
    scorePackage(
      dealToPackage(d),
      answersFrom(
        {
          destinations: null,
          countries: null,
          tripType: null,
          style: null,
          maxBudgetPerPerson: null,
          nights: d.dates.nights,
          people: d.people,
          minStars: null,
          board: null,
          directOnly: null,
          musts: null,
          exclude: null,
        },
        d.destination,
      ),
    ),
  );

  const rows = [
    {
      label: "יעד",
      values: deals.map(
        (d) => `${d.destination.emoji} ${d.destination.name}, ${d.destination.country}`,
      ),
    },
    { label: "מלון", values: deals.map((d) => `${d.hotel.name} (${d.hotel.stars}★)`) },
    { label: "דירוג אורחים", values: deals.map((d) => `${d.hotel.guestRating} / 10`) },
    { label: "לילות", values: deals.map((d) => `${d.dates.nights}`) },
    { label: "בסיס אירוח", values: deals.map((d) => boardLabels[d.board]) },
    { label: "מחיר לאדם", values: deals.map((d) => fmt(d.price.perPerson)) },
    { label: "סה״כ", values: deals.map((d) => fmt(d.price.total)) },
    {
      label: "טיסה",
      values: deals.map(
        (d) =>
          `${d.outbound.airline} · ${d.outbound.stops === 0 ? "ישירה" : `${d.outbound.stops} עצירות`}`,
      ),
    },
    {
      label: "ביטול",
      values: deals.map((d) => (d.freeCancellation ? "ביטול חינם" : "לפי מדיניות הספק")),
    },
    {
      label: "מחיר חכם",
      values: deals.map((d) => {
        const sp = smartPrice(d);
        return sp ? `${sp.emoji} ${sp.label}` : "אין נתון";
      }),
    },
    { label: "NITZI Score", values: scores.map((s) => `${s}/100`) },
  ];

  const cheapest = deals.reduce((a, b) => (b.price.perPerson < a.price.perPerson ? b : a));
  const bestHotel = deals.reduce((a, b) =>
    b.hotel.stars * 10 + b.hotel.guestRating > a.hotel.stars * 10 + a.hotel.guestRating ? b : a,
  );
  const bestValueIdx = scores.indexOf(Math.max(...scores));

  return {
    items: deals.map((d) => ({ dealId: d.id, title: d.title, destination: d.destination.name })),
    rows,
    bestValueDealId: deals[bestValueIdx]?.id ?? null,
    bestHotelDealId: bestHotel.id,
    cheapestDealId: cheapest.id,
  };
}

/** Compact catalog view so the model knows exactly what exists. */
export async function listCatalog(): Promise<
  {
    slug: string;
    name: string;
    country: string;
    region: string;
    matches: string[];
    hasOffers: boolean;
    avgBudgetPerPerson: number;
    flightHours: number;
  }[]
> {
  const catalog = await getCatalog();
  return catalog.map((d) => ({
    slug: d.slug,
    name: d.name,
    country: d.country,
    region: d.region,
    matches: d.matches,
    hasOffers: d.hasOffers,
    avgBudgetPerPerson: d.avgBudgetPerPerson,
    flightHours: d.flightHours,
  }));
}
