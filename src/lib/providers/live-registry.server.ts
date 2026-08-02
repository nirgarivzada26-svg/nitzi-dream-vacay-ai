// Live provider registry — server only.
//
// Single place that resolves which adapters answer, in which order, and
// exposes the search / revalidation entry points the app uses. When live mode
// is off, or no adapter is configured, callers get a "not configured" result
// and the existing demo provider keeps serving the UI.

import type {
  DynamicPackage,
  FlightProviderAdapter,
  FlightSearchRequest,
  HotelOffer,
  HotelProviderAdapter,
  HotelSearchRequest,
  ProviderStatus,
} from "./contracts";
import { keepValidProducts } from "./contracts";
import type { FlightOffer, VerifiedQuote } from "./verification";
import { FLIGHT_ADAPTERS, flightAdapterStatuses } from "./flight-adapters.server";
import { HOTEL_ADAPTERS, hotelAdapterStatuses } from "./hotel-adapters.server";
import { PAYMENT_ADAPTERS, paymentAdapterStatuses } from "./payment-adapters.server";
import {
  EMAIL_ADAPTERS,
  SMS_ADAPTERS,
  messagingAdapterStatuses,
} from "./messaging-adapters.server";
import { liveModeEnabled, providerOrder } from "./credentials.server";
import { runWithFailover, type ChainMember } from "./failover.server";

function chain<A extends { isConfigured(): boolean }>(
  adapters: Record<string, A>,
  order: string[],
): ChainMember<A>[] {
  return order
    .map((id) => adapters[id])
    .filter((a): a is A => Boolean(a))
    .map((a) => ({
      id: (a as unknown as { descriptor: { id: string } }).descriptor.id,
      adapter: a,
      configured: liveModeEnabled() && a.isConfigured(),
    }));
}

export function flightChain(): ChainMember<FlightProviderAdapter>[] {
  return chain(
    FLIGHT_ADAPTERS,
    providerOrder("NITZI_FLIGHT_PROVIDERS", ["amadeus", "travelport", "sabre"]),
  );
}

export function hotelChain(): ChainMember<HotelProviderAdapter>[] {
  return chain(HOTEL_ADAPTERS, providerOrder("NITZI_HOTEL_PROVIDERS", ["hotelbeds", "booking"]));
}

export function paymentChain() {
  return chain(PAYMENT_ADAPTERS, providerOrder("NITZI_PAYMENT_PROVIDERS", ["stripe", "hyp"]));
}

export function emailChain() {
  return chain(EMAIL_ADAPTERS, providerOrder("NITZI_EMAIL_PROVIDERS", ["lovable-email"]));
}

export function smsChain() {
  return chain(SMS_ADAPTERS, providerOrder("NITZI_SMS_PROVIDERS", ["twilio"]));
}

/* ------------------------------------------------------------ operations */

export async function searchLiveFlights(req: FlightSearchRequest) {
  const res = await runWithFailover(
    "flight",
    "searchFlights",
    flightChain(),
    (a) => a.searchFlights(req),
    { destination: req.destinationCode, departDate: req.departDate },
  );
  if (!res.ok) return res;
  // Production validation: unverified or stale inventory never reaches the UI.
  return { ...res, data: keepValidProducts<FlightOffer>(res.data, (o) => o.quote) };
}

export async function revalidateLiveFlight(offerId: string, req: FlightSearchRequest) {
  return runWithFailover<FlightProviderAdapter, VerifiedQuote>(
    "flight",
    "revalidatePrice",
    flightChain(),
    (a) => a.revalidatePrice(offerId, req),
    { offerId },
  );
}

export async function searchLiveHotels(req: HotelSearchRequest) {
  const res = await runWithFailover(
    "hotel",
    "searchHotels",
    hotelChain(),
    (a) => a.searchHotels(req),
    { destination: req.destinationSlug },
  );
  if (!res.ok) return res;
  return { ...res, data: keepValidProducts<HotelOffer>(res.data, (o) => o.quote) };
}

export async function revalidateLiveHotel(hotelId: string, req: HotelSearchRequest) {
  return runWithFailover<HotelProviderAdapter, VerifiedQuote>(
    "hotel",
    "revalidatePrice",
    hotelChain(),
    (a) => a.revalidatePrice(hotelId, req),
    { hotelId },
  );
}

/* --------------------------------------------------------------- status */

export function providerStatuses(): ProviderStatus[] {
  const live = liveModeEnabled();
  const activeByKind = new Map<string, string>();
  for (const [kind, members] of [
    ["flight", flightChain()],
    ["hotel", hotelChain()],
    ["payment", paymentChain()],
    ["email", emailChain()],
    ["sms", smsChain()],
  ] as const) {
    const first = members.find((m) => m.configured);
    if (first) activeByKind.set(kind, first.id);
  }
  return [
    ...flightAdapterStatuses(),
    ...hotelAdapterStatuses(),
    ...paymentAdapterStatuses(),
    ...messagingAdapterStatuses(),
  ].map((s) => ({ ...s, active: live && activeByKind.get(s.kind) === s.id }));
}

export function liveMode(): boolean {
  return liveModeEnabled();
}

export type { DynamicPackage };
