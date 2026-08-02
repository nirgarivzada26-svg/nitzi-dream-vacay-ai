// Sprint 8 — common provider contracts.
//
// Every external supplier (flights, hotels, packages, payments, email, SMS)
// implements one of the interfaces below and returns the SAME standardized
// objects. Switching supplier is a configuration change only: no UI, route or
// booking-flow change. Nothing here imports server-only modules, so the types
// are safe to use from components.

import type { FlightOffer, VerifiedQuote } from "./verification";
import type { Hotel } from "./types";

/* ------------------------------------------------------------- envelopes */

export type ProviderKind = "flight" | "hotel" | "package" | "payment" | "email" | "sms";

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  flight: "טיסות",
  hotel: "מלונות",
  package: "חבילות",
  payment: "סליקה",
  email: "אימייל",
  sms: "SMS / WhatsApp",
};

export interface ProviderError {
  code:
    | "not_configured"
    | "unauthorized"
    | "rate_limited"
    | "timeout"
    | "upstream_error"
    | "not_found"
    | "validation_failed"
    | "unavailable";
  message: string;
  /** Failover only moves on when the error is retryable on another provider. */
  retryable: boolean;
}

export type ProviderResult<T> =
  | { ok: true; providerId: string; latencyMs: number; data: T }
  | { ok: false; providerId: string; latencyMs: number; error: ProviderError };

export function providerOk<T>(providerId: string, data: T, latencyMs = 0): ProviderResult<T> {
  return { ok: true, providerId, latencyMs, data };
}

export function providerFail<T>(
  providerId: string,
  error: ProviderError,
  latencyMs = 0,
): ProviderResult<T> {
  return { ok: false, providerId, latencyMs, error };
}

export function notConfigured(providerId: string): ProviderError {
  return {
    code: "not_configured",
    message: `הספק ${providerId} אינו מוגדר — נדרשים מפתחות פרודקשן`,
    retryable: true,
  };
}

/* ------------------------------------------------------------ descriptor */

export interface ProviderDescriptor {
  id: string;
  kind: ProviderKind;
  label: string;
  /** Environment variables the adapter needs before it can go live. */
  requiredEnv: string[];
}

export interface ProviderStatus extends ProviderDescriptor {
  configured: boolean;
  missingEnv: string[];
  /** true when this provider is the one currently answering requests. */
  active: boolean;
}

/* --------------------------------------------------------------- flights */

export interface FlightSearchRequest {
  origin: string;
  destinationCode: string;
  destinationName: string;
  departDate: string;
  returnDate: string | null;
  adults: number;
  cabin?: "economy" | "premium-economy" | "business";
  currency: "ILS";
  limit?: number;
}

export interface ReservationRequest {
  offerId: string;
  passengers: {
    firstName: string;
    lastName: string;
    birthDate: string;
    passport: string;
    passportExpiry: string;
  }[];
  contact: { email: string; phone: string };
  currency: "ILS";
  expectedTotal: number;
}

export interface Reservation {
  /** Supplier PNR / booking reference. */
  reference: string;
  status: "confirmed" | "pending" | "cancelled";
  providerId: string;
  createdAt: string;
  total: number;
  currency: "ILS";
  raw?: Record<string, unknown>;
}

export interface FlightProviderAdapter {
  descriptor: ProviderDescriptor;
  isConfigured(): boolean;
  searchFlights(req: FlightSearchRequest): Promise<ProviderResult<FlightOffer[]>>;
  getFlight(offerId: string, req: FlightSearchRequest): Promise<ProviderResult<FlightOffer>>;
  checkAvailability(offerId: string, req: FlightSearchRequest): Promise<ProviderResult<boolean>>;
  revalidatePrice(
    offerId: string,
    req: FlightSearchRequest,
  ): Promise<ProviderResult<VerifiedQuote>>;
  createReservation(req: ReservationRequest): Promise<ProviderResult<Reservation>>;
}

/* ---------------------------------------------------------------- hotels */

export interface HotelSearchRequest {
  destinationSlug: string;
  destinationName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  currency: "ILS";
  limit?: number;
}

export interface HotelOffer {
  hotel: Hotel;
  board: string;
  refundable: boolean;
  roomName: string;
  quote: VerifiedQuote;
  providerId: string;
  deeplink: string | null;
}

export interface HotelProviderAdapter {
  descriptor: ProviderDescriptor;
  isConfigured(): boolean;
  searchHotels(req: HotelSearchRequest): Promise<ProviderResult<HotelOffer[]>>;
  getHotel(hotelId: string, req: HotelSearchRequest): Promise<ProviderResult<HotelOffer>>;
  checkAvailability(hotelId: string, req: HotelSearchRequest): Promise<ProviderResult<boolean>>;
  revalidatePrice(hotelId: string, req: HotelSearchRequest): Promise<ProviderResult<VerifiedQuote>>;
}

/* -------------------------------------------------------------- packages */

export interface PackageComponentPrice {
  id: string;
  label: string;
  /** Per-person price in ILS; transfers/insurance/extras may be per booking. */
  perPerson: number;
  perBooking: number;
}

export interface DynamicPackageRequest {
  flightOfferId: string | null;
  hotelOfferId: string | null;
  destinationSlug: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  transfers: boolean;
  insurance: boolean;
  extras: string[];
  currency: "ILS";
}

export interface DynamicPackage {
  components: PackageComponentPrice[];
  nights: number;
  people: number;
  /** Server-computed totals — the client never sums prices. */
  perPerson: number;
  total: number;
  currency: "ILS";
  quote: VerifiedQuote;
  providerIds: string[];
}

/* -------------------------------------------------------------- payments */

export type PaymentOperation = "authorize" | "capture" | "refund" | "cancel";

export interface PaymentRequest {
  amount: number;
  currency: "ILS";
  idempotencyKey: string;
  bookingId?: string | null;
  userId?: string | null;
  description?: string;
  method?: "card" | "apple" | "google" | "bit";
  /** Provider transaction reference for capture / refund / cancel. */
  reference?: string;
}

export interface PaymentResult {
  status: "authorized" | "captured" | "refunded" | "cancelled" | "pending" | "failed";
  reference: string;
  amount: number;
  currency: "ILS";
  providerId: string;
  raw?: Record<string, unknown>;
}

export interface WebhookVerification {
  verified: boolean;
  eventType: string;
  externalId: string;
  payload: Record<string, unknown>;
  reason?: string;
}

export interface PaymentProviderAdapter {
  descriptor: ProviderDescriptor;
  isConfigured(): boolean;
  authorize(req: PaymentRequest): Promise<ProviderResult<PaymentResult>>;
  capture(req: PaymentRequest): Promise<ProviderResult<PaymentResult>>;
  refund(req: PaymentRequest): Promise<ProviderResult<PaymentResult>>;
  cancel(req: PaymentRequest): Promise<ProviderResult<PaymentResult>>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification>;
}

/* ------------------------------------------------------ email / messaging */

export const EMAIL_TEMPLATES = [
  "booking_confirmation",
  "invoice",
  "voucher",
  "price_alert",
  "password_reset",
  "welcome",
  "booking_changed",
  "booking_cancelled",
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const SMS_TEMPLATES = [
  "booking_confirmation",
  "flight_changed",
  "price_alert",
  "departure_reminder",
] as const;
export type SmsTemplate = (typeof SMS_TEMPLATES)[number];

export interface EmailMessage {
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  userId?: string | null;
}

export interface SmsMessage {
  to: string;
  template: SmsTemplate;
  body: string;
  channel: "sms" | "whatsapp";
  userId?: string | null;
}

export interface DeliveryResult {
  messageId: string;
  status: "sent" | "queued" | "skipped";
  providerId: string;
}

export interface EmailProviderAdapter {
  descriptor: ProviderDescriptor;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<ProviderResult<DeliveryResult>>;
}

export interface SmsProviderAdapter {
  descriptor: ProviderDescriptor;
  isConfigured(): boolean;
  send(message: SmsMessage): Promise<ProviderResult<DeliveryResult>>;
}

/* --------------------------------------------------- product validation */

export interface ProductValidation {
  valid: boolean;
  reasons: string[];
}

/**
 * A travel product may only reach the UI when its quote exists, is verified,
 * carries a price, a currency and a provider timestamp, and is still fresh.
 * Anything else is hidden — never shown as stale inventory.
 */
export function validateProduct(
  quote: VerifiedQuote | null | undefined,
  now = Date.now(),
): ProductValidation {
  const reasons: string[] = [];
  if (!quote) return { valid: false, reasons: ["אין הצעה מאומתת מהספק"] };
  if (!quote.verified) reasons.push(quote.reason ?? "ההצעה לא אומתה מול הספק");
  if (quote.perPerson === null || quote.perPerson <= 0) reasons.push("אין מחיר מאומת");
  if (!quote.currency) reasons.push("חסר מטבע");
  if (!quote.verifiedAt) reasons.push("חסר חותמת זמן מהספק");
  else if (now - new Date(quote.verifiedAt).getTime() >= quote.ttlSeconds * 1000)
    reasons.push("ההצעה פגה — נדרש אימות מחדש");
  if (quote.availability === "unavailable" || quote.availability === "sold-out")
    reasons.push("אין זמינות אצל הספק");
  return { valid: reasons.length === 0, reasons };
}

/** Convenience filter used by search paths before results reach the UI. */
export function keepValidProducts<T>(
  items: T[],
  getQuote: (item: T) => VerifiedQuote | null | undefined,
  now = Date.now(),
): T[] {
  return items.filter((item) => validateProduct(getQuote(item), now).valid);
}
