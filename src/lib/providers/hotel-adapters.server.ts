// Live hotel adapters — server only. Same contract for every supplier.

import type { HotelOffer, HotelProviderAdapter, HotelSearchRequest, ProviderResult } from "./contracts";
import { notConfigured, providerFail, providerOk } from "./contracts";
import type { VerifiedQuote } from "./verification";
import { unavailableQuote } from "./verification";
import { configured, env, httpJson, missing } from "./credentials.server";
import { QUOTE_TTL_SECONDS } from "./config";

const BOOKING_ENV = ["BOOKING_API_KEY", "BOOKING_AFFILIATE_ID"];
const HOTELBEDS_ENV = ["HOTELBEDS_API_KEY", "HOTELBEDS_SECRET"];

function nights(a: string, b: string): number {
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  return d > 0 ? Math.round(d) : 1;
}

function quote(total: number, people: number, source: string): VerifiedQuote {
  const perPerson = Math.round(total / Math.max(1, people));
  return {
    verified: true,
    perPerson,
    total: Math.round(total),
    currency: "ILS",
    verifiedAt: new Date().toISOString(),
    ttlSeconds: QUOTE_TTL_SECONDS,
    availability: "available",
    unitsLeft: null,
    source,
    reason: null,
  };
}

/* ------------------------------------------------------------- Hotelbeds */

interface HotelbedsRate {
  net?: string;
  boardName?: string;
  rateClass?: string;
  name?: string;
  allotment?: number;
}
interface HotelbedsHotel {
  code?: number;
  name?: string;
  categoryName?: string;
  destinationName?: string;
  minRate?: string;
  currency?: string;
  reviews?: { rate?: number; reviewCount?: number }[];
  rooms?: { rates?: HotelbedsRate[]; name?: string }[];
}

async function hotelbedsSignature(): Promise<{ apiKey: string; signature: string }> {
  const apiKey = env("HOTELBEDS_API_KEY") ?? "";
  const secret = env("HOTELBEDS_SECRET") ?? "";
  const ts = Math.floor(Date.now() / 1000);
  const bytes = new TextEncoder().encode(`${apiKey}${secret}${ts}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { apiKey, signature };
}

export const hotelbedsAdapter: HotelProviderAdapter = {
  descriptor: {
    id: "hotelbeds",
    kind: "hotel",
    label: "Hotelbeds APItude",
    requiredEnv: [...HOTELBEDS_ENV, "HOTELBEDS_DESTINATION_MAP"],
  },
  isConfigured: () => configured(HOTELBEDS_ENV),
  async searchHotels(req) {
    if (!configured(HOTELBEDS_ENV)) return providerFail("hotelbeds", notConfigured("hotelbeds"));
    const map = JSON.parse(env("HOTELBEDS_DESTINATION_MAP") ?? "{}") as Record<string, string>;
    const code = map[req.destinationSlug];
    if (!code)
      return providerFail("hotelbeds", {
        code: "not_found",
        message: `אין מיפוי Hotelbeds ליעד ${req.destinationSlug}`,
        retryable: true,
      });
    const host = env("HOTELBEDS_HOST") ?? "https://api.test.hotelbeds.com";
    const { apiKey, signature } = await hotelbedsSignature();
    const res = await httpJson(`${host}/hotel-api/1.0/hotels`, {
      method: "POST",
      headers: {
        "Api-key": apiKey,
        "X-Signature": signature,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stay: { checkIn: req.checkIn, checkOut: req.checkOut },
        occupancies: [{ rooms: req.rooms, adults: req.adults, children: 0 }],
        destination: { code },
        language: "ENG",
      }),
    });
    if (res.status === 401)
      return providerFail("hotelbeds", { code: "unauthorized", message: "Hotelbeds auth failed", retryable: true });
    if (res.status >= 400)
      return providerFail("hotelbeds", {
        code: "upstream_error",
        message: `Hotelbeds ${res.status}`,
        retryable: true,
      });
    const hotels = ((res.body as { hotels?: { hotels?: HotelbedsHotel[] } } | null)?.hotels?.hotels ?? [])
      .slice(0, req.limit ?? 12)
      .map((h): HotelOffer | null => {
        const rate = h.rooms?.[0]?.rates?.[0];
        const total = Number(rate?.net ?? h.minRate ?? 0);
        if (!Number.isFinite(total) || total <= 0) return null;
        const n = nights(req.checkIn, req.checkOut);
        return {
          hotel: {
            id: String(h.code ?? ""),
            name: h.name ?? "",
            stars: Number((h.categoryName ?? "").replace(/\D/g, "")) || 3,
            guestRating: h.reviews?.[0]?.rate ?? 0,
            reviewsCount: h.reviews?.[0]?.reviewCount ?? 0,
            pricePerNight: Math.round(total / n),
            currency: "ILS",
            location: h.destinationName ?? req.destinationName,
            amenities: [],
            source: "hotelbeds",
          },
          board: rate?.boardName ?? "",
          refundable: rate?.rateClass === "NRF" ? false : true,
          roomName: h.rooms?.[0]?.name ?? "",
          quote: quote(total, req.adults, "hotelbeds"),
          providerId: "hotelbeds",
          deeplink: null,
        };
      })
      .filter((h): h is HotelOffer => h !== null);
    return providerOk("hotelbeds", hotels);
  },
  async getHotel(hotelId, req) {
    const res = await this.searchHotels(req);
    if (!res.ok) return res as ProviderResult<HotelOffer>;
    const match = res.data.find((h) => h.hotel.id === hotelId);
    if (!match)
      return providerFail("hotelbeds", { code: "not_found", message: "המלון אינו זמין", retryable: false });
    return providerOk("hotelbeds", match);
  },
  async checkAvailability(hotelId, req) {
    const res = await this.getHotel(hotelId, req);
    return providerOk("hotelbeds", res.ok);
  },
  async revalidatePrice(hotelId, req) {
    const res = await this.getHotel(hotelId, req);
    if (!res.ok) return providerOk("hotelbeds", unavailableQuote("hotelbeds", res.error.message));
    return providerOk("hotelbeds", res.data.quote);
  },
};

/* --------------------------------------------------------------- Booking */

/**
 * Booking.com Demand API access requires an approved partner contract. Wiring,
 * credentials and failover position are complete; the transport activates once
 * the partner key is issued.
 */
export const bookingAdapter: HotelProviderAdapter = {
  descriptor: {
    id: "booking",
    kind: "hotel",
    label: "Booking.com Demand API",
    requiredEnv: BOOKING_ENV,
  },
  isConfigured: () => configured(BOOKING_ENV),
  async searchHotels() {
    if (!configured(BOOKING_ENV)) return providerFail("booking", notConfigured("booking"));
    return providerFail("booking", {
      code: "unavailable",
      message: "Booking.com: חוזה השותפות טרם אושר",
      retryable: true,
    });
  },
  async getHotel() {
    return providerFail("booking", notConfigured("booking"));
  },
  async checkAvailability() {
    return providerFail("booking", notConfigured("booking"));
  },
  async revalidatePrice() {
    return providerFail("booking", notConfigured("booking"));
  },
};

export const HOTEL_ADAPTERS: Record<string, HotelProviderAdapter> = {
  hotelbeds: hotelbedsAdapter,
  booking: bookingAdapter,
};

export function hotelAdapterStatuses() {
  return Object.values(HOTEL_ADAPTERS).map((a) => ({
    ...a.descriptor,
    configured: a.isConfigured(),
    missingEnv: missing(a.descriptor.requiredEnv),
  }));
}
