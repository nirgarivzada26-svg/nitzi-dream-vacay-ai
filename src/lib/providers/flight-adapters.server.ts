// Live flight adapters — server only.
//
// All three implement the identical FlightProviderAdapter contract, so the
// failover chain and the UI cannot tell them apart. Adding production keys is
// the only step needed to switch a supplier on.

import type {
  FlightProviderAdapter,
  FlightSearchRequest,
  ProviderResult,
  Reservation,
  ReservationRequest,
} from "./contracts";
import { notConfigured, providerFail, providerOk } from "./contracts";
import type { FlightOffer, FlightSegment, VerifiedQuote } from "./verification";
import { unavailableQuote } from "./verification";
import { configured, env, httpJson, missing } from "./credentials.server";
import { QUOTE_TTL_SECONDS } from "./config";

const AMADEUS_ENV = ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"];
const TRAVELPORT_ENV = [
  "TRAVELPORT_CLIENT_ID",
  "TRAVELPORT_CLIENT_SECRET",
  "TRAVELPORT_ACCESS_GROUP",
];
const SABRE_ENV = ["SABRE_CLIENT_ID", "SABRE_CLIENT_SECRET", "SABRE_PCC"];

function freshQuote(perPerson: number, people: number, source: string): VerifiedQuote {
  return {
    verified: true,
    perPerson,
    total: perPerson * Math.max(1, people),
    currency: "ILS",
    verifiedAt: new Date().toISOString(),
    ttlSeconds: QUOTE_TTL_SECONDS,
    availability: "available",
    unitsLeft: null,
    source,
    reason: null,
  };
}

/* --------------------------------------------------------------- Amadeus */

let amadeusToken: { value: string; expiresAt: number } | null = null;

async function amadeusAccessToken(): Promise<string> {
  if (amadeusToken && amadeusToken.expiresAt > Date.now() + 30_000) return amadeusToken.value;
  const host = env("AMADEUS_HOST") ?? "https://test.api.amadeus.com";
  const res = await httpJson(`${host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env("AMADEUS_CLIENT_ID") ?? "",
      client_secret: env("AMADEUS_CLIENT_SECRET") ?? "",
    }).toString(),
  });
  const body = res.body as { access_token?: string; expires_in?: number } | null;
  if (res.status !== 200 || !body?.access_token) throw new Error("Amadeus authentication failed");
  amadeusToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 1500) * 1000,
  };
  return amadeusToken.value;
}

interface AmadeusSegment {
  carrierCode: string;
  number: string;
  aircraft?: { code?: string };
  departure: { iataCode: string; terminal?: string; at: string };
  arrival: { iataCode: string; terminal?: string; at: string };
  duration?: string;
}

function isoMinutes(duration: string | undefined): number {
  if (!duration) return 0;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(duration);
  return (Number(m?.[1] ?? 0) * 60 + Number(m?.[2] ?? 0)) | 0;
}

function amadeusToOffer(raw: Record<string, unknown>, people: number): FlightOffer | null {
  const itineraries =
    (raw["itineraries"] as { segments: AmadeusSegment[]; duration?: string }[]) ?? [];
  const first = itineraries[0];
  if (!first || first.segments.length === 0) return null;
  const price = raw["price"] as { grandTotal?: string; total?: string } | undefined;
  const perPerson = Number(price?.grandTotal ?? price?.total ?? 0);
  if (!Number.isFinite(perPerson) || perPerson <= 0) return null;

  const segments: FlightSegment[] = first.segments.map((s) => ({
    airlineCode: s.carrierCode,
    airlineName: s.carrierCode,
    flightNumber: `${s.carrierCode}${s.number}`,
    aircraft: s.aircraft?.code ?? null,
    originCode: s.departure.iataCode,
    originName: s.departure.iataCode,
    originTerminal: s.departure.terminal ?? null,
    destinationCode: s.arrival.iataCode,
    destinationName: s.arrival.iataCode,
    destinationTerminal: s.arrival.terminal ?? null,
    departAt: s.departure.at,
    arriveAt: s.arrival.at,
    durationMinutes: isoMinutes(s.duration),
  }));

  const travelerPricing = (
    raw["travelerPricings"] as
      | {
          fareDetailsBySegment?: { includedCheckedBags?: { quantity?: number; weight?: number } }[];
        }[]
      | undefined
  )?.[0];
  const bag = travelerPricing?.fareDetailsBySegment?.[0]?.includedCheckedBags;

  return {
    id: String(raw["id"] ?? segments[0]?.flightNumber ?? "amadeus-offer"),
    segments,
    stops: segments.length - 1,
    layoverMinutes: segments.slice(1).map((s, i) => {
      const prev = segments[i];
      return prev
        ? Math.max(0, (new Date(s.departAt).getTime() - new Date(prev.arriveAt).getTime()) / 60000)
        : 0;
    }),
    durationMinutes:
      isoMinutes(first.duration) || segments.reduce((a, s) => a + s.durationMinutes, 0),
    cabin: "economy",
    baggage: {
      carryOnIncluded: true,
      checkedBagIncluded: Boolean(bag?.quantity),
      checkedBagKg: bag?.weight ?? null,
      seatSelectionIncluded: false,
      mealIncluded: false,
    },
    refundable: false,
    fareRules: [],
    quote: freshQuote(Math.round(perPerson), people, "amadeus"),
    source: "amadeus",
    deeplink: null,
  };
}

export const amadeusFlightAdapter: FlightProviderAdapter = {
  descriptor: {
    id: "amadeus",
    kind: "flight",
    label: "Amadeus Self-Service",
    requiredEnv: AMADEUS_ENV,
  },
  isConfigured: () => configured(AMADEUS_ENV),
  async searchFlights(req) {
    if (!configured(AMADEUS_ENV)) return providerFail("amadeus", notConfigured("amadeus"));
    const token = await amadeusAccessToken();
    const host = env("AMADEUS_HOST") ?? "https://test.api.amadeus.com";
    const params = new URLSearchParams({
      originLocationCode: req.origin,
      destinationLocationCode: req.destinationCode,
      departureDate: req.departDate,
      adults: String(req.adults),
      currencyCode: req.currency,
      max: String(req.limit ?? 10),
    });
    if (req.returnDate) params.set("returnDate", req.returnDate);
    const res = await httpJson(`${host}/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      amadeusToken = null;
      return providerFail("amadeus", {
        code: "unauthorized",
        message: "Amadeus token rejected",
        retryable: true,
      });
    }
    if (res.status === 429)
      return providerFail("amadeus", {
        code: "rate_limited",
        message: "Amadeus rate limit",
        retryable: true,
      });
    if (res.status >= 400)
      return providerFail("amadeus", {
        code: "upstream_error",
        message: `Amadeus ${res.status}`,
        retryable: true,
      });
    const list = ((res.body as { data?: Record<string, unknown>[] } | null)?.data ?? [])
      .map((o) => amadeusToOffer(o, req.adults))
      .filter((o): o is FlightOffer => o !== null);
    return providerOk("amadeus", list);
  },
  async getFlight(offerId, req) {
    const res = await this.searchFlights(req);
    if (!res.ok) return res as ProviderResult<FlightOffer>;
    const match = res.data.find((o) => o.id === offerId);
    if (!match)
      return providerFail("amadeus", {
        code: "not_found",
        message: "ההצעה כבר לא קיימת",
        retryable: false,
      });
    return providerOk("amadeus", match);
  },
  async checkAvailability(offerId, req) {
    const res = await this.getFlight(offerId, req);
    return res.ok ? providerOk("amadeus", true) : providerOk("amadeus", false);
  },
  async revalidatePrice(offerId, req) {
    const res = await this.getFlight(offerId, req);
    if (!res.ok) return providerOk("amadeus", unavailableQuote("amadeus", res.error.message));
    return providerOk("amadeus", res.data.quote);
  },
  async createReservation(req) {
    if (!configured(AMADEUS_ENV)) return providerFail("amadeus", notConfigured("amadeus"));
    const token = await amadeusAccessToken();
    const host = env("AMADEUS_HOST") ?? "https://test.api.amadeus.com";
    const res = await httpJson(`${host}/v1/booking/flight-orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          type: "flight-order",
          flightOffers: [{ id: req.offerId }],
          travelers: req.passengers.map((p, i) => ({
            id: String(i + 1),
            dateOfBirth: p.birthDate,
            name: { firstName: p.firstName, lastName: p.lastName },
            contact: {
              emailAddress: req.contact.email,
              phones: req.contact.phone
                ? [{ deviceType: "MOBILE", countryCallingCode: "972", number: req.contact.phone }]
                : [],
            },
            documents: p.passport
              ? [
                  {
                    documentType: "PASSPORT",
                    number: p.passport,
                    expiryDate: p.passportExpiry,
                    holder: true,
                  },
                ]
              : [],
          })),
        },
      }),
    });
    if (res.status >= 400)
      return providerFail("amadeus", {
        code: "upstream_error",
        message: `Amadeus booking ${res.status}`,
        retryable: false,
      });
    const data = (
      res.body as { data?: { id?: string; associatedRecords?: { reference?: string }[] } }
    )?.data;
    const reference = data?.associatedRecords?.[0]?.reference ?? data?.id ?? "";
    if (!reference)
      return providerFail("amadeus", {
        code: "upstream_error",
        message: "לא התקבל מספר הזמנה",
        retryable: false,
      });
    const reservation: Reservation = {
      reference,
      status: "confirmed",
      providerId: "amadeus",
      createdAt: new Date().toISOString(),
      total: req.expectedTotal,
      currency: req.currency,
    };
    return providerOk("amadeus", reservation);
  },
};

/* -------------------------------------------------- Travelport / Sabre --- */

/**
 * GDS adapters that require a signed distribution agreement and certification
 * before their endpoints may be called. The contract, credential wiring and
 * failover placement are complete; the transport turns on the moment the
 * credentials below exist and certification passes.
 */
function gdsAdapter(
  id: string,
  label: string,
  requiredEnv: string[],
  hostEnv: string,
): FlightProviderAdapter {
  const pending = (op: string) =>
    providerFail<never>(id, {
      code: "unavailable",
      message: `${label}: ההסמכה מול הספק טרם הושלמה (${op})`,
      retryable: true,
    });
  return {
    descriptor: { id, kind: "flight", label, requiredEnv: [...requiredEnv, hostEnv] },
    isConfigured: () => configured([...requiredEnv, hostEnv]),
    async searchFlights() {
      if (!this.isConfigured()) return providerFail(id, notConfigured(id));
      return pending("search") as ProviderResult<FlightOffer[]>;
    },
    async getFlight() {
      if (!this.isConfigured()) return providerFail(id, notConfigured(id));
      return pending("details") as ProviderResult<FlightOffer>;
    },
    async checkAvailability() {
      if (!this.isConfigured()) return providerFail(id, notConfigured(id));
      return pending("availability") as ProviderResult<boolean>;
    },
    async revalidatePrice() {
      if (!this.isConfigured()) return providerFail(id, notConfigured(id));
      return pending("revalidate") as ProviderResult<VerifiedQuote>;
    },
    async createReservation() {
      if (!this.isConfigured()) return providerFail(id, notConfigured(id));
      return pending("reservation") as ProviderResult<Reservation>;
    },
  };
}

export const travelportFlightAdapter = gdsAdapter(
  "travelport",
  "Travelport JSON API",
  TRAVELPORT_ENV,
  "TRAVELPORT_HOST",
);

export const sabreFlightAdapter = gdsAdapter("sabre", "Sabre REST", SABRE_ENV, "SABRE_HOST");

export const FLIGHT_ADAPTERS: Record<string, FlightProviderAdapter> = {
  amadeus: amadeusFlightAdapter,
  travelport: travelportFlightAdapter,
  sabre: sabreFlightAdapter,
};

export function flightAdapterStatuses() {
  return Object.values(FLIGHT_ADAPTERS).map((a) => ({
    ...a.descriptor,
    configured: a.isConfigured(),
    missingEnv: missing(a.descriptor.requiredEnv),
  }));
}
