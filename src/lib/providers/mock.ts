// Placeholder provider — generates plausible options procedurally from the
// search context. Replace with real API adapters (Booking / Skyscanner /
// Amadeus) by implementing the same interfaces in a sibling file and
// swapping the export in ./registry.ts. No UI change required.

import type {
  Flight,
  Hotel,
  Package,
  FlightProvider,
  HotelProvider,
  PackageProvider,
  SearchContext,
} from "./types";

// Deterministic pseudo-random from string seed so results are stable per search.
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}
const pick = <T>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

const HOTEL_BRANDS = [
  "Grand",
  "Royal",
  "Blue Horizon",
  "Sunset",
  "Marina",
  "Palazzo",
  "Aurora",
  "Bay View",
  "Casa",
  "The Lodge",
  "Azure",
  "Palm",
  "Vista",
  "Boutique",
];
const HOTEL_SUFFIX = ["Suites", "Resort & Spa", "Boutique", "Hotel", "Retreat", "Villas"];
const AMENITIES_POOL = [
  "pool",
  "spa",
  "parking",
  "breakfast",
  "gym",
  "wifi",
  "beachfront",
  "family",
  "adults-only",
  "restaurant",
  "bar",
  "airport-shuttle",
];
const AIRLINES = [
  { code: "LY", name: "אל על" },
  { code: "IZ", name: "ארקיע" },
  { code: "6H", name: "ישראייר" },
  { code: "LH", name: "לופטהנזה" },
  { code: "TK", name: "טורקיש איירליינס" },
  { code: "AF", name: "אייר פראנס" },
  { code: "W6", name: "וויז אייר" },
  { code: "FR", name: "ריינאייר" },
];

function buildHotel(ctx: SearchContext, idx: number, r: () => number): Hotel {
  const { destination, answers } = ctx;
  const stars = 3 + Math.floor(r() * 3); // 3..5
  // Budget-driven price per night: distribute around per-person budget × 0.35 / nights.
  const perPersonPerNight = (answers.budget * 0.35) / Math.max(1, answers.days);
  const spread = 0.55 + r() * 1.4; // 0.55 .. 1.95
  const luxuryBoost = answers.style === "luxury" ? 1.25 : 1;
  const pricePerNight = Math.round(perPersonPerNight * spread * luxuryBoost);

  const name = `${pick(r, HOTEL_BRANDS)} ${destination.name} ${pick(r, HOTEL_SUFFIX)}`;
  const amenityCount = 3 + Math.floor(r() * 5);
  const amenities: string[] = [];
  while (amenities.length < amenityCount) {
    const a = pick(r, AMENITIES_POOL);
    if (!amenities.includes(a)) amenities.push(a);
  }
  if (answers.type === "family" && r() > 0.4 && !amenities.includes("family"))
    amenities.push("family");
  if (answers.type === "romantic" && r() > 0.5 && !amenities.includes("adults-only"))
    amenities.push("adults-only");

  return {
    id: `mock-hotel-${idx}-${destination.name}`,
    name,
    stars,
    guestRating: Number((7.4 + r() * 2.4).toFixed(1)),
    reviewsCount: 120 + Math.floor(r() * 3800),
    pricePerNight,
    currency: "ILS",
    location: `${destination.name}, ${destination.country}`,
    distanceToCenterKm: Number((r() * 6).toFixed(1)),
    distanceToBeachKm: destination.matches.includes("beach")
      ? Number((r() * 2).toFixed(1))
      : undefined,
    amenities,
    source: "mock",
  };
}

function buildFlight(ctx: SearchContext, idx: number, r: () => number): Flight {
  const { destination, answers, origin = "TLV", startDate } = ctx;
  const airline = pick(r, AIRLINES);
  const base = startDate ? new Date(startDate) : new Date(Date.now() + 14 * 864e5);
  const depH = 5 + Math.floor(r() * 18);
  const depart = new Date(base);
  depart.setHours(depH, Math.floor(r() * 60), 0, 0);
  const stops = r() > 0.55 ? 0 : r() > 0.4 ? 1 : 2;
  const layover = stops * (60 + Math.floor(r() * 180));
  const durationMinutes = Math.round(destination.flightHours * 60 + layover);
  const arrive = new Date(depart.getTime() + durationMinutes * 60000);

  const basePrice = Math.max(450, destination.flightHours * 220);
  const stopDiscount = stops === 0 ? 1.25 : stops === 1 ? 0.95 : 0.75;
  const price = Math.round(basePrice * stopDiscount * (0.8 + r() * 0.7));

  return {
    id: `mock-flight-${idx}-${destination.name}`,
    airline: airline.name,
    flightNumber: `${airline.code}${100 + Math.floor(r() * 900)}`,
    origin,
    destination: destination.name,
    departAt: depart.toISOString(),
    arriveAt: arrive.toISOString(),
    durationMinutes,
    stops,
    price,
    currency: "ILS",
    source: "mock",
  };
}

export const mockHotelProvider: HotelProvider = {
  id: "mock",
  async search(ctx, opts) {
    const limit = opts?.limit ?? 8;
    const r = rng(
      `hotel|${ctx.destination.name}|${ctx.answers.budget}|${ctx.answers.days}|${ctx.answers.style}`,
    );
    return Array.from({ length: limit }, (_, i) => buildHotel(ctx, i, r));
  },
};

export const mockFlightProvider: FlightProvider = {
  id: "mock",
  async search(ctx, opts) {
    const limit = opts?.limit ?? 6;
    const r = rng(`flight|${ctx.destination.name}|${ctx.startDate ?? ""}|${ctx.answers.people}`);
    return Array.from({ length: limit }, (_, i) => buildFlight(ctx, i, r));
  },
};

export const mockPackageProvider: PackageProvider = {
  id: "mock",
  async search(ctx, opts) {
    const limit = opts?.limit ?? 5;
    const [hotels, flights] = await Promise.all([
      mockHotelProvider.search(ctx, { limit: limit + 2 }),
      mockFlightProvider.search(ctx, { limit: limit + 2 }),
    ]);
    const r = rng(`pkg|${ctx.destination.name}|${ctx.answers.budget}`);
    const nights = ctx.answers.days;
    const people = Math.max(1, ctx.answers.people);
    const out: Package[] = [];
    for (let i = 0; i < Math.min(limit, hotels.length, flights.length); i++) {
      const hotel = hotels[i];
      const flight = flights[i];
      const separate = hotel.pricePerNight * nights * people + flight.price * people;
      const discount = 0.08 + r() * 0.14;
      const total = Math.round(separate * (1 - discount));
      out.push({
        id: `mock-pkg-${i}-${ctx.destination.name}`,
        title: `${hotel.name} + ${flight.airline}`,
        hotel,
        flight,
        nights,
        totalPrice: total,
        separatePrice: separate,
        savings: separate - total,
        includes: [
          `${nights} לילות`,
          "טיסה הלוך-חזור",
          hotel.amenities.includes("breakfast") ? "ארוחת בוקר" : "העברות",
          hotel.stars >= 5 ? "שדרוג חדר בכפוף לזמינות" : "ביטול חינם עד 7 ימים",
        ],
        rating: Number(((hotel.guestRating + (flight.stops === 0 ? 9 : 7.5)) / 2).toFixed(1)),
        source: "mock",
      });
    }
    return out;
  },
};
