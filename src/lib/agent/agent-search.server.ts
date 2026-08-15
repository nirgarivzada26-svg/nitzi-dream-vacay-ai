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
import { currentOperatingMode } from "@/lib/providers/credentials.server";
import { getActiveOffers } from "@/lib/offers/active-offers.server";
import { demoCanonicalId } from "@/lib/offers/canonical-id";
import { isFreeCancellation } from "@/lib/cancellation-policy";
import type { CanonicalOffer } from "@/lib/offers/canonical-offer";
import { resolveOffer } from "@/lib/offers/resolve-offer.server";
import type {
  AgentComparison,
  AgentComparisonRow,
  AgentFilters,
  AgentRecommendation,
  AgentSearchResult,
  RelaxationSuggestion,
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

/**
 * The single strongest real reason to pick this deal — one sentence,
 * deterministic, picked from actual deal facts in a fixed priority order.
 * Never LLM-generated text.
 */
export function advantageFor(deal: Deal, f: AgentFilters): string | null {
  const directBoth = deal.outbound.stops === 0 && deal.inbound.stops === 0;
  const withinBudget = f.maxBudgetPerPerson ? deal.price.perPerson <= f.maxBudgetPerPerson : false;

  if (directBoth && withinBudget) return "טיסה ישירה הלוך ושוב ובתוך התקציב שביקשת";
  if (withinBudget) return `בתוך התקציב: ₪${deal.price.perPerson.toLocaleString()} לאדם`;
  if (directBoth) return "טיסה ישירה הלוך ושוב";
  if (deal.discountPct >= 15) return `הנחה של ${deal.discountPct}% מהמחיר המחירון`;
  if (deal.hotel.guestRating >= 9)
    return `דירוג אורחים גבוה: ${deal.hotel.guestRating}/10 (${deal.hotel.reviewsCount} ביקורות)`;
  if (deal.board === "all-inclusive") return "הכל כלול — בלי הוצאות נוספות על אוכל";
  if (deal.freeCancellation) return "ביטול חינם";
  return null;
}

/**
 * The single most notable real trade-off of this deal — same determinism
 * rule as advantageFor(). Returns null when there genuinely isn't one worth
 * naming (never invents a compromise to fill the field).
 */
export function compromiseFor(deal: Deal, f: AgentFilters): string | null {
  if (f.maxBudgetPerPerson && deal.price.perPerson > f.maxBudgetPerPerson) {
    return `מעל התקציב ב-₪${(deal.price.perPerson - f.maxBudgetPerPerson).toLocaleString()} לאדם`;
  }
  if (deal.outbound.stops > 0 || deal.inbound.stops > 0) {
    return "יש קונקשן בטיסה (לא ישירה)";
  }
  if (f.minStars && deal.hotel.stars < f.minStars) {
    return `${deal.hotel.stars}★ — פחות מהדירוג שביקשת (${f.minStars}★)`;
  }
  if (f.board && deal.board !== f.board) {
    return `בסיס האירוח הוא ${boardLabels[deal.board]}, לא ${boardLabels[f.board]}`;
  }
  if (!deal.freeCancellation) return "ללא ביטול חינם";
  return null;
}

/**
 * Cheaper/better alternative references — ONLY ever point at a dealId that
 * is present in `pool` (the same call's own returned recommendations, after
 * slicing to the limit actually shown). Never a separate lookup, so any
 * alternative NITZI mentions is a card the user can already see and click.
 */
export function alternativesWithin(
  target: Deal,
  pool: { deal: Deal }[],
): { cheaperAlternativeDealId: string | null; betterAlternativeDealId: string | null } {
  const others = pool.filter((p) => p.deal.id !== target.id);

  const cheaper = others
    .filter((p) => p.deal.price.perPerson < target.price.perPerson)
    .sort((a, b) => a.deal.price.perPerson - b.deal.price.perPerson)[0];

  const targetQuality = target.hotel.stars * 10 + target.hotel.guestRating;
  const better = others
    .filter((p) => p.deal.hotel.stars * 10 + p.deal.hotel.guestRating > targetQuality)
    .sort(
      (a, b) =>
        b.deal.hotel.stars * 10 +
        b.deal.hotel.guestRating -
        (a.deal.hotel.stars * 10 + a.deal.hotel.guestRating),
    )[0];

  return {
    cheaperAlternativeDealId: cheaper?.deal.id ?? null,
    betterAlternativeDealId: better?.deal.id ?? null,
  };
}
function toRecommendation(
  deal: Deal,
  f: AgentFilters,
  score: number,
  alternatives: { cheaperAlternativeDealId: string | null; betterAlternativeDealId: string | null },
): AgentRecommendation {
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
    cancellationPolicy: deal.cancellationPolicy,
    outbound: deal.outbound,
    inbound: deal.inbound,
    nitziScore: score,
    smartPrice: sp
      ? { level: sp.level, label: sp.label, detail: sp.detail, emoji: sp.emoji }
      : null,
    reasons: reasonsFor(deal, f),
    note: null,
    advantage: advantageFor(deal, f),
    compromise: compromiseFor(deal, f),
    cheaperAlternativeDealId: alternatives.cheaperAlternativeDealId,
    betterAlternativeDealId: alternatives.betterAlternativeDealId,
    canonicalId: demoCanonicalId(deal.id),
    sourceMode: "demo",
    providerId: "nitzi-demo",
    providerOfferId: deal.id,
    availabilityState:
      deal.price.availability === "limited"
        ? "limited"
        : deal.price.availability === "available"
          ? "available"
          : "unavailable",
    tags: deal.destination.matches,
  };
}

export function passesFilters(deal: Deal, f: AgentFilters): boolean {
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

/**
 * Proves — by actually re-running passesFilters with exactly one relaxation
 * applied at a time — whether a single constraint is what's blocking every
 * match. Never guesses: only returns a suggestion when relaxing that one
 * field alone would produce a real match, checked in a fixed priority order
 * so the most useful single suggestion (rather than every possible one) is
 * returned.
 */
export function diagnoseBlockingConstraint(
  deals: Deal[],
  f: AgentFilters,
): RelaxationSuggestion | null {
  const probes: {
    field: RelaxationSuggestion["field"];
    relax: (x: AgentFilters) => AgentFilters;
    message: string;
    suggestion: string;
  }[] = [
    {
      field: "directOnly",
      relax: (x) => ({ ...x, directOnly: null }),
      message: "לא מצאתי טיסה ישירה שמתאימה לשאר הבקשה שלך.",
      suggestion: "רוצה שאבדוק גם טיסות עם קונקשן?",
    },
    {
      field: "board",
      relax: (x) => ({ ...x, board: null }),
      message: f.board ? `לא מצאתי חבילה עם בסיס אירוח ${boardLabels[f.board]}.` : "",
      suggestion: "רוצה שאבדוק גם בסיסי אירוח אחרים?",
    },
    {
      field: "minStars",
      relax: (x) => ({ ...x, minStars: null }),
      message: f.minStars ? `לא מצאתי מלון ${f.minStars}★ ומעלה שמתאים לשאר הבקשה.` : "",
      suggestion: "רוצה שאבדוק גם דירוג כוכבים נמוך יותר?",
    },
    {
      field: "maxBudgetPerPerson",
      relax: (x) => ({ ...x, maxBudgetPerPerson: null }),
      message: f.maxBudgetPerPerson
        ? `לא מצאתי חבילה בתקציב של ₪${f.maxBudgetPerPerson.toLocaleString()} לאדם.`
        : "",
      suggestion: "רוצה שאראה לך אפשרויות מעל התקציב, כדי שתראה כמה זה יעלה בפועל?",
    },
    {
      field: "nights",
      relax: (x) => ({ ...x, nights: null }),
      message: f.nights ? `לא מצאתי חבילה באורך של בדיוק ${f.nights} לילות.` : "",
      suggestion: "רוצה שאבדוק גם מספר לילות קרוב לזה?",
    },
  ];

  for (const probe of probes) {
    const relaxed = probe.relax(f);
    // Skip probes whose field wasn't even set — relaxing an unset field
    // can't be "the" blocking constraint.
    const fieldWasSet =
      relaxed[probe.field as keyof AgentFilters] !== f[probe.field as keyof AgentFilters];
    if (!fieldWasSet) continue;
    const wouldMatch = deals.some((d) => passesFilters(d, relaxed));
    if (wouldMatch) {
      return { field: probe.field, message: probe.message, suggestion: probe.suggestion };
    }
  }
  return null;
}

export async function searchTrips(filters: AgentFilters, limit = 5): Promise<AgentSearchResult> {
  const mode = currentOperatingMode();
  if (mode !== "demo") {
    return searchTripsLive(filters, limit, mode);
  }

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
    const destinationMissing =
      anyPlace.length === 0 && (filters.destinations?.length || filters.countries?.length);
    const destinationHasNoOffers = anyPlace.length > 0 && anyPlace.every((d) => !d.hasOffers);

    // Only probe for a specific blocking constraint when the destination
    // itself isn't the problem — otherwise "relaxing a filter" is beside
    // the point.
    const blockingConstraint =
      !destinationMissing && !destinationHasNoOffers
        ? diagnoseBlockingConstraint(deals, filters)
        : null;

    const reason = destinationMissing
      ? "היעד המבוקש לא קיים בקטלוג של NITZI"
      : destinationHasNoOffers
        ? "היעד קיים בקטלוג אך אין כרגע חבילות זמינות אליו"
        : (blockingConstraint?.message ?? "אין חבילה בקטלוג שעומדת בכל התנאים שהוגדרו");

    return {
      count: 0,
      filtersUsed: filters,
      recommendations: [],
      emptyReason: reason,
      blockingConstraint,
    };
  }

  const scored = matched
    .map((deal) => ({
      deal,
      score: scorePackage(dealToPackage(deal), answersFrom(filters, deal.destination)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 8)));

  // Alternatives are computed against this same, already-sliced `scored`
  // pool — never a fresh lookup — so any alternative referenced below is
  // guaranteed to be one of the cards actually returned to the client.
  return {
    count: matched.length,
    filtersUsed: filters,
    recommendations: scored.map(({ deal, score }) =>
      toRecommendation(deal, filters, score, alternativesWithin(deal, scored)),
    ),
    emptyReason: null,
    blockingConstraint: null,
  };
}

// ---------------------------------------------------------------------------
// SANDBOX/LIVE AI recommendation pipeline — sources exclusively through
// getActiveOffers() (the canonical offer layer). No function below this
// point calls listDeals()/getDeal() — structurally, not just conventionally
// (neither is imported for this purpose in this section).
// ---------------------------------------------------------------------------

function matchesPlaceOffer(offer: CanonicalOffer, needles: string[]): boolean {
  return needles.some((raw) => {
    const n = norm(raw);
    if (!n) return false;
    return (
      norm(offer.destination.slug) === n ||
      norm(offer.destination.city).includes(n) ||
      n.includes(norm(offer.destination.city)) ||
      norm(offer.destination.country).includes(n) ||
      n.includes(norm(offer.destination.country)) ||
      norm(offer.destination.region).includes(n)
    );
  });
}

function passesFiltersOffer(offer: CanonicalOffer, f: AgentFilters): boolean {
  if (offer.availabilityState === "unavailable") return false;
  if (f.exclude?.length && matchesPlaceOffer(offer, f.exclude)) return false;
  if (f.destinations?.length && !matchesPlaceOffer(offer, f.destinations)) return false;
  if (f.countries?.length && !matchesPlaceOffer(offer, f.countries)) return false;
  if (f.tripType && !offer.tags.includes(f.tripType)) return false;
  if (f.minStars && offer.hotel.stars < f.minStars) return false;
  // Board can only be matched when the provider actually told us the board
  // — "unknown" can never be assumed to match a specific request.
  if (f.board && offer.hotel.board !== f.board) return false;
  if (f.directOnly) {
    if (!offer.flight) return false;
    if (offer.flight.outbound.stops > 0 || offer.flight.inbound.stops > 0) return false;
  }
  if (f.nights) {
    if (offer.dates === null) return false;
    if (Math.abs(offer.dates.nights - f.nights) > 2) return false;
  }
  if (f.maxBudgetPerPerson) {
    if (offer.pricing.pricePerPerson === null) return false;
    if (offer.pricing.pricePerPerson > f.maxBudgetPerPerson * 1.15) return false;
  }
  const musts = f.musts ?? [];
  if (musts.includes("all-inclusive") && offer.hotel.board !== "all-inclusive") return false;
  if (musts.includes("free-cancellation") && !isFreeCancellation(offer.hotel.cancellationPolicy))
    return false;
  if (musts.includes("beach") && !offer.tags.includes("beach")) return false;
  // "pool" has no honest equivalent anywhere in the active provider layer
  // (no amenities data reaches CanonicalOffer) — never assumed to match.
  if (musts.includes("pool")) return false;
  return true;
}

function scoreOffer(offer: CanonicalOffer, f: AgentFilters): number {
  let score = 50;
  const guestRating = offer.hotel.guestRating ?? 0;
  score += Math.min(20, Math.round((guestRating / 10) * 20));
  score += Math.min(10, offer.hotel.stars * 2);
  if (offer.flight && offer.flight.outbound.stops === 0 && offer.flight.inbound.stops === 0)
    score += 10;
  if (f.maxBudgetPerPerson && offer.pricing.pricePerPerson !== null) {
    if (offer.pricing.pricePerPerson <= f.maxBudgetPerPerson) score += 10;
  }
  if (isFreeCancellation(offer.hotel.cancellationPolicy)) score += 5;
  return Math.max(0, Math.min(100, score));
}

function advantageForOffer(offer: CanonicalOffer, f: AgentFilters): string | null {
  const directBoth = offer.flight
    ? offer.flight.outbound.stops === 0 && offer.flight.inbound.stops === 0
    : false;
  const price = offer.pricing.pricePerPerson;
  const withinBudget =
    f.maxBudgetPerPerson && price !== null ? price <= f.maxBudgetPerPerson : false;

  if (directBoth && withinBudget) return "טיסה ישירה הלוך ושוב ובתוך התקציב שביקשת";
  if (withinBudget) return `בתוך התקציב: ₪${price!.toLocaleString()} לאדם`;
  if (directBoth) return "טיסה ישירה הלוך ושוב";
  if (offer.pricing.discountPct !== null && offer.pricing.discountPct >= 15)
    return `הנחה של ${offer.pricing.discountPct}% מהמחיר המחירון`;
  if (offer.hotel.guestRating !== null && offer.hotel.guestRating >= 9)
    return `דירוג אורחים גבוה: ${offer.hotel.guestRating}/10`;
  if (offer.hotel.board === "all-inclusive") return "הכל כלול — בלי הוצאות נוספות על אוכל";
  if (isFreeCancellation(offer.hotel.cancellationPolicy)) return "ביטול חינם";
  return null;
}

function compromiseForOffer(offer: CanonicalOffer, f: AgentFilters): string | null {
  const price = offer.pricing.pricePerPerson;
  if (f.maxBudgetPerPerson && price !== null && price > f.maxBudgetPerPerson) {
    return `מעל התקציב ב-₪${(price - f.maxBudgetPerPerson).toLocaleString()} לאדם`;
  }
  if (offer.flight && (offer.flight.outbound.stops > 0 || offer.flight.inbound.stops > 0)) {
    return "יש קונקשן בטיסה (לא ישירה)";
  }
  if (f.minStars && offer.hotel.stars < f.minStars) {
    return `${offer.hotel.stars}★ — פחות מהדירוג שביקשת (${f.minStars}★)`;
  }
  if (f.board && offer.hotel.board !== "unknown" && offer.hotel.board !== f.board) {
    return `בסיס האירוח הוא ${offer.hotel.board}, לא ${f.board}`;
  }
  if (offer.hotel.cancellationPolicy.kind === "unknown") {
    return "מדיניות הביטול תאומת לפני ההזמנה";
  }
  if (!isFreeCancellation(offer.hotel.cancellationPolicy)) return "ללא ביטול חינם";
  return null;
}

/** Same pool-scoping rule as alternativesWithin() — only ever references an
 *  offer present in the same call's own (already-sliced) result set. */
function alternativesWithinOffers(
  target: CanonicalOffer,
  pool: CanonicalOffer[],
): { cheaperAlternativeDealId: string | null; betterAlternativeDealId: string | null } {
  const others = pool.filter((o) => o.canonicalId !== target.canonicalId);
  const targetPrice = target.pricing.pricePerPerson;

  const cheaper =
    targetPrice !== null
      ? others
          .filter(
            (o) => o.pricing.pricePerPerson !== null && o.pricing.pricePerPerson < targetPrice,
          )
          .sort((a, b) => a.pricing.pricePerPerson! - b.pricing.pricePerPerson!)[0]
      : undefined;

  const targetQuality = target.hotel.stars * 10 + (target.hotel.guestRating ?? 0);
  const better = others
    .filter((o) => o.hotel.stars * 10 + (o.hotel.guestRating ?? 0) > targetQuality)
    .sort(
      (a, b) =>
        b.hotel.stars * 10 +
        (b.hotel.guestRating ?? 0) -
        (a.hotel.stars * 10 + (a.hotel.guestRating ?? 0)),
    )[0];

  return {
    cheaperAlternativeDealId: cheaper?.canonicalId ?? null,
    betterAlternativeDealId: better?.canonicalId ?? null,
  };
}

function reasonsForOffer(offer: CanonicalOffer, f: AgentFilters): string[] {
  const out: string[] = [];
  const price = offer.pricing.pricePerPerson;
  if (f.maxBudgetPerPerson && price !== null) {
    out.push(
      price <= f.maxBudgetPerPerson
        ? `בתוך התקציב: ₪${price.toLocaleString()} לאדם מתוך ₪${f.maxBudgetPerPerson.toLocaleString()}`
        : `מעל התקציב ב-₪${(price - f.maxBudgetPerPerson).toLocaleString()} לאדם`,
    );
  }
  if (f.minStars && offer.hotel.stars >= f.minStars)
    out.push(`מלון ${offer.hotel.stars}★ — עומד בדרישה שלך`);
  if (offer.flight && offer.flight.outbound.stops === 0 && offer.flight.inbound.stops === 0)
    out.push("טיסה ישירה הלוך ושוב");
  if (offer.hotel.board === "all-inclusive") out.push("הכל כלול");
  else if (offer.hotel.board !== "unknown") out.push(`בסיס אירוח: ${offer.hotel.board}`);
  if (offer.pricing.discountPct !== null && offer.pricing.discountPct > 0)
    out.push(`הנחה של ${offer.pricing.discountPct}% מהמחיר המחירון`);
  if (isFreeCancellation(offer.hotel.cancellationPolicy)) out.push("ביטול חינם");
  if (f.tripType && offer.tags.includes(f.tripType))
    out.push(`${offer.destination.city} מתאים לחופשה מסוג זה לפי הקטלוג`);
  if (offer.hotel.guestRating !== null && offer.hotel.guestRating >= 9)
    out.push(`דירוג אורחים ${offer.hotel.guestRating}`);
  return out.slice(0, 5);
}

function toRecommendationFromOffer(
  offer: CanonicalOffer,
  f: AgentFilters,
  score: number,
  alternatives: { cheaperAlternativeDealId: string | null; betterAlternativeDealId: string | null },
): AgentRecommendation {
  const flight = offer.flight;
  const emptyLeg = {
    airline: "",
    flightNumber: "",
    departAt: "",
    arriveAt: "",
    stops: 0,
    durationMinutes: 0,
  };
  return {
    dealId: offer.canonicalId,
    kind: "package",
    destination: offer.destination.city,
    destinationSlug: offer.destination.slug,
    country: offer.destination.country,
    emoji: "",
    image: null,
    hotelName: offer.hotel.name,
    hotelStars: offer.hotel.stars,
    guestRating: offer.hotel.guestRating ?? 0,
    board: offer.hotel.board,
    nights: offer.dates?.nights ?? 0,
    people: 0,
    startDate: offer.dates?.start ?? "",
    endDate: offer.dates?.end ?? "",
    pricePerPerson: offer.pricing.pricePerPerson ?? 0,
    totalPrice: offer.pricing.totalPrice ?? 0,
    currency: offer.pricing.currency,
    availability: offer.availabilityState,
    verifiedAt: offer.verifiedAt ?? "",
    source: offer.providerId,
    freeCancellation: isFreeCancellation(offer.hotel.cancellationPolicy),
    cancellationPolicy: offer.hotel.cancellationPolicy,
    outbound: flight
      ? {
          airline: flight.outbound.airline,
          flightNumber: flight.outbound.flightNumber ?? "",
          departAt: flight.outbound.departAt ?? "",
          arriveAt: flight.outbound.arriveAt ?? "",
          stops: flight.outbound.stops,
          durationMinutes: flight.outbound.durationMinutes ?? 0,
        }
      : emptyLeg,
    inbound: flight
      ? {
          airline: flight.inbound.airline,
          flightNumber: flight.inbound.flightNumber ?? "",
          departAt: flight.inbound.departAt ?? "",
          arriveAt: flight.inbound.arriveAt ?? "",
          stops: flight.inbound.stops,
          durationMinutes: flight.inbound.durationMinutes ?? 0,
        }
      : null,
    nitziScore: score,
    smartPrice: null, // smartPrice() is Deal-specific and needs a catalog average — not computed for live offers, never faked
    reasons: reasonsForOffer(offer, f),
    note: offer.pricing.verified === false ? "המחיר טרם אומת סופית מול הספק" : null,
    advantage: advantageForOffer(offer, f),
    compromise: compromiseForOffer(offer, f),
    cheaperAlternativeDealId: alternatives.cheaperAlternativeDealId,
    betterAlternativeDealId: alternatives.betterAlternativeDealId,
    canonicalId: offer.canonicalId,
    sourceMode: offer.sourceMode as "sandbox" | "live",
    providerId: offer.providerId,
    providerOfferId: offer.providerOfferId,
    availabilityState: offer.availabilityState,
    tags: offer.tags,
  };
}

async function searchTripsLive(
  filters: AgentFilters,
  limit: number,
  mode: "sandbox" | "live",
): Promise<AgentSearchResult> {
  const active = await getActiveOffers();
  const matched = active.offers.filter((o) => passesFiltersOffer(o, filters));

  if (matched.length === 0) {
    return {
      count: 0,
      filtersUsed: filters,
      recommendations: [],
      emptyReason:
        active.emptyReason ??
        (mode === "sandbox"
          ? "ספק ה-SANDBOX לא החזיר תוצאות שמתאימות לבקשה"
          : "לא נמצאו הצעות מהספקים החיים שמתאימות לבקשה"),
      blockingConstraint: null,
    };
  }

  const scored = matched
    .map((offer) => ({ offer, score: scoreOffer(offer, filters) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 8)));
  const offerPool = scored.map((s) => s.offer);

  return {
    count: matched.length,
    filtersUsed: filters,
    recommendations: scored.map(({ offer, score }) =>
      toRecommendationFromOffer(offer, filters, score, alternativesWithinOffers(offer, offerPool)),
    ),
    emptyReason: null,
    blockingConstraint: null,
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
      blockingConstraint: null,
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
      blockingConstraint: null,
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
    // No real rate-level cancellation data exists for an ad-hoc built trip
    // (no supplier rate object backs it yet) — honestly unknown, never invented.
    cancellationPolicy: { kind: "unknown" },
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
    // buildTrip produces exactly one result with no sibling deals from the
    // same catalog/scoring pipeline to compare against, so there is
    // nothing honest to compute here yet — never invented.
    advantage: bestFlight.stops === 0 ? "טיסה ישירה" : null,
    compromise: bestFlight.stops > 0 ? "יש קונקשן בטיסה (לא ישירה)" : null,
    cheaperAlternativeDealId: null,
    betterAlternativeDealId: null,
    // No real canonical offer identity exists for an ad-hoc built trip (no
    // supplier rate/offer object backs it) — honestly null, never invented.
    canonicalId: null,
    sourceMode: currentOperatingMode(),
    providerId: null,
    providerOfferId: null,
    availabilityState: null,
    tags: dest.matches,
  };

  return {
    count: 1,
    filtersUsed: filters,
    recommendations: [rec],
    emptyReason: null,
    blockingConstraint: null,
  };
}

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString()}`;
}

/**
 * SANDBOX/LIVE comparison. Uses resolveOffer() per canonicalId — never
 * getActiveOffers() (a fresh broad search could return a different offer
 * than the one the user actually selected). resolveOffer() looks the
 * specific requested offer up by its durable-store identity and revalidates
 * it, which is exactly "the same logical offer, currently verified" — never
 * a substitute. Never calls getDeal()/listDeals() — structurally absent
 * from this function.
 */
async function compareTripsLive(
  canonicalIds: string[],
  mode: "sandbox" | "live",
): Promise<AgentComparison> {
  const ids = canonicalIds.slice(0, 3);
  const resolutions = await Promise.all(ids.map((id) => resolveOffer(id)));

  if (resolutions.length === 0) {
    return {
      items: [],
      rows: [],
      bestValueDealId: null,
      bestHotelDealId: null,
      cheapestDealId: null,
      note: null,
    };
  }

  const statusLabel: Record<string, string> = {
    expired: "ההצעה פגה",
    sold_out: "אזל המלאי",
    availability_changed: "הזמינות השתנתה",
    provider_unavailable: "לא ניתן לאמת מול הספק",
    unsupported: "לא ניתן לאמת את ההצעה במלואה",
    not_found: "ההצעה לא נמצאה",
  };

  const comparable = resolutions.filter(
    (r): r is typeof r & { refreshedOffer: CanonicalOffer } =>
      (r.status === "available" || r.status === "price_changed") && r.refreshedOffer !== null,
  );

  const items = resolutions.map((r) => ({
    dealId: r.canonicalId,
    title: r.refreshedOffer ? r.refreshedOffer.hotel.name : (statusLabel[r.status] ?? r.status),
    destination: r.refreshedOffer?.destination.city ?? "",
  }));

  const rows: AgentComparisonRow[] = [
    {
      label: "סטטוס",
      values: resolutions.map((r) =>
        r.status === "available"
          ? "זמין ומאומת"
          : r.status === "price_changed"
            ? "זמין (המחיר התעדכן)"
            : (statusLabel[r.status] ?? "לא ידוע"),
      ),
    },
    {
      label: "יעד",
      values: resolutions.map((r) =>
        r.refreshedOffer
          ? `${r.refreshedOffer.destination.city}, ${r.refreshedOffer.destination.country}`
          : "—",
      ),
    },
    {
      label: "מלון",
      values: resolutions.map((r) =>
        r.refreshedOffer
          ? `${r.refreshedOffer.hotel.name} (${r.refreshedOffer.hotel.stars}★)`
          : "—",
      ),
    },
    {
      label: "דירוג אורחים",
      values: resolutions.map((r) =>
        r.refreshedOffer?.hotel.guestRating !== null &&
        r.refreshedOffer?.hotel.guestRating !== undefined
          ? `${r.refreshedOffer.hotel.guestRating} / 10`
          : "לא ידוע",
      ),
    },
    {
      label: "בסיס אירוח",
      values: resolutions.map((r) =>
        r.refreshedOffer && r.refreshedOffer.hotel.board !== "unknown"
          ? r.refreshedOffer.hotel.board
          : "לא ידוע",
      ),
    },
    {
      label: "מחיר לאדם",
      values: resolutions.map((r) => (r.currentPrice !== null ? fmt(r.currentPrice) : "לא זמין")),
    },
    {
      label: "טיסה",
      values: resolutions.map((r) => {
        const f = r.refreshedOffer?.flight;
        if (!f) return "לא ידוע";
        return `${f.outbound.airline} · ${f.outbound.stops === 0 ? "ישירה" : `${f.outbound.stops} עצירות`}`;
      }),
    },
    {
      label: "ביטול",
      values: resolutions.map((r) => {
        const cp = r.refreshedOffer?.hotel.cancellationPolicy;
        if (!cp || cp.kind === "unknown") return "מדיניות הביטול תאומת לפני ההזמנה";
        return isFreeCancellation(cp) ? "ביטול חינם" : "לפי מדיניות הספק";
      }),
    },
    {
      label: "אימות מחיר",
      values: resolutions.map((r) =>
        r.refreshedOffer?.pricing.verified ? "מחיר מאומת" : "טרם אומת סופית",
      ),
    },
  ];

  if (resolutions.some((r) => r.status === "price_changed")) {
    rows.push({
      label: "שינוי מחיר",
      values: resolutions.map((r) =>
        r.status === "price_changed" && r.priceDifference !== null
          ? `התעדכן ב-₪${Math.abs(r.priceDifference).toLocaleString()}`
          : "ללא שינוי",
      ),
    });
  }

  let cheapestDealId: string | null = null;
  let bestHotelDealId: string | null = null;
  let bestValueDealId: string | null = null;

  const withPrice = comparable.filter((r) => r.currentPrice !== null);
  if (withPrice.length >= 2) {
    cheapestDealId = withPrice.reduce((a, b) =>
      b.currentPrice! < a.currentPrice! ? b : a,
    ).canonicalId;
  }

  const withHotelQuality = comparable.filter((r) => r.refreshedOffer.hotel.guestRating !== null);
  if (withHotelQuality.length >= 2) {
    bestHotelDealId = withHotelQuality.reduce((a, b) => {
      const qa = a.refreshedOffer.hotel.stars * 10 + a.refreshedOffer.hotel.guestRating!;
      const qb = b.refreshedOffer.hotel.stars * 10 + b.refreshedOffer.hotel.guestRating!;
      return qb > qa ? b : a;
    }).canonicalId;
  }

  const withScore = comparable.filter((r) => r.refreshedOffer.nitziScore !== null);
  if (withScore.length === comparable.length && withScore.length >= 2) {
    bestValueDealId = withScore.reduce((a, b) =>
      b.refreshedOffer.nitziScore! > a.refreshedOffer.nitziScore! ? b : a,
    ).canonicalId;
  }

  const note =
    comparable.length < 2 || (!cheapestDealId && !bestHotelDealId && !bestValueDealId)
      ? "אין כרגע מספיק מידע מאומת כדי לקבוע איזה דיל עדיף באופן חד-משמעי."
      : null;

  return { items, rows, bestValueDealId, bestHotelDealId, cheapestDealId, note };
}

export async function compareTrips(dealIds: string[]): Promise<AgentComparison> {
  const mode = currentOperatingMode();
  if (mode !== "demo") {
    return compareTripsLive(dealIds, mode);
  }

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
      note: null,
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
          requestedDates: null,
          dateFlexibility: null,
          childrenAges: null,
          baggagePreference: null,
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
    note: null,
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
