// LIVE booking creation — the smallest safe parallel path alongside
// placeBooking() (bookings.functions.ts), which remains completely
// unmodified and demo-only.
//
// MANDATORY RULE: a LIVE offer being valid on /deal/:id or in booking-request
// is NOT sufficient to book it. This function always calls resolveOffer()
// itself, fresh, as the very last step before writing anything or
// attempting a charge — a cached/previously-seen price or availability
// state is never trusted here, regardless of what the client claims to
// have seen.
//
// Booking snapshot: stored in the EXISTING `bookings.snapshot` jsonb column
// (already free-form — confirmed by inspection, no migration needed).
// Account/booking-detail/admin all already read bookings purely from this
// stored snapshot (confirmed: booking.$id.tsx never re-calls getDeal()) —
// so a LIVE booking's snapshot never depends on provider_offer_cache still
// having the row once the booking exists.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTRA_IDS, computeExtras } from "@/lib/booking-extras";
import { resolveOffer } from "@/lib/offers/resolve-offer.server";

const passengerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().max(20).optional().default(""),
  passport: z.string().trim().max(30).optional().default(""),
  passportExpiry: z.string().trim().max(20).optional().default(""),
});

const inputSchema = z.object({
  canonicalId: z.string().trim().min(1).max(300),
  idempotencyKey: z.string().trim().min(8).max(100),
  passengers: z.array(passengerSchema).min(1).max(9),
  extras: z.array(z.enum(EXTRA_IDS)).max(EXTRA_IDS.length).default([]),
  contact: z.object({
    email: z.string().trim().email().max(160),
    phone: z.string().trim().max(40).optional().default(""),
  }),
  paymentMethod: z.enum(["card", "apple", "google", "bit"]),
  // The price the customer saw and is explicitly committing to. Never
  // trusted as the charge amount by itself — only ever compared against the
  // server's own fresh resolveOffer() result below. A mismatch means the
  // price moved again since the customer last saw it, and the booking is
  // stopped, not silently reconciled.
  acceptedPricePerPerson: z.number().finite().positive().max(1_000_000),
});

export type PlaceLiveBookingInput = z.infer<typeof inputSchema>;

export type PlaceLiveBookingResult =
  | { ok: true; booking: Record<string, unknown> }
  | {
      ok: false;
      status:
        | "price_changed"
        | "availability_changed"
        | "expired"
        | "sold_out"
        | "provider_unavailable"
        | "not_found"
        | "unsupported"
        | "payment_failed";
      currentPricePerPerson: number | null;
      priceDifference: number | null;
    };

export async function placeLiveBookingCore(data: PlaceLiveBookingInput, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { authorizePayment, capturePayment, cancelPayment } =
    await import("@/lib/providers/payments.server");

  const existing = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .eq("idempotency_key", data.idempotencyKey)
    .maybeSingle();
  if (existing.data) return { ok: true, booking: existing.data };

  const resolution = await resolveOffer(data.canonicalId);

  if (resolution.status !== "available" && resolution.status !== "price_changed") {
    return {
      ok: false,
      status: resolution.status as Exclude<PlaceLiveBookingResult, { ok: true }>["status"],
      currentPricePerPerson: resolution.currentPrice,
      priceDifference: resolution.priceDifference,
    };
  }

  const offer = resolution.refreshedOffer;
  if (!offer || resolution.currentPrice === null) {
    return { ok: false, status: "unsupported", currentPricePerPerson: null, priceDifference: null };
  }

  if (resolution.currentPrice !== data.acceptedPricePerPerson) {
    return {
      ok: false,
      status: "price_changed",
      currentPricePerPerson: resolution.currentPrice,
      priceDifference: resolution.currentPrice - data.acceptedPricePerPerson,
    };
  }

  const people = data.passengers.length;
  const perPerson = resolution.currentPrice;
  const base = perPerson * people;
  const { lines, total: extrasTotal } = computeExtras(data.extras, people);
  const total = base + extrasTotal;

  const authResult = await authorizePayment({
    amount: total,
    currency: offer.pricing.currency,
    idempotencyKey: data.idempotencyKey,
    userId,
    method: data.paymentMethod,
    description: `NITZI · ${offer.destination.city} · ${people} נוסעים`,
  });

  const providerConfigured = authResult.ok || authResult.error.code !== "not_configured";
  let paymentStatus: "paid" | "demo" = "demo";

  if (providerConfigured) {
    if (!authResult.ok) {
      return {
        ok: false,
        status: "payment_failed",
        currentPricePerPerson: perPerson,
        priceDifference: null,
      };
    }
    const captureResult = await capturePayment({
      amount: total,
      currency: offer.pricing.currency,
      idempotencyKey: data.idempotencyKey,
      userId,
      method: data.paymentMethod,
      reference: authResult.data.reference,
    });
    if (!captureResult.ok) {
      await cancelPayment({
        amount: total,
        currency: offer.pricing.currency,
        idempotencyKey: data.idempotencyKey,
        userId,
        reference: authResult.data.reference,
      }).catch(() => {
        /* best-effort release */
      });
      return {
        ok: false,
        status: "payment_failed",
        currentPricePerPerson: perPerson,
        priceDifference: null,
      };
    }
    paymentStatus = "paid";
  }

  const { data: row, error } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: userId,
      idempotency_key: data.idempotencyKey,
      deal_id: offer.canonicalId,
      destination_name: offer.destination.city,
      people,
      nights: offer.dates?.nights ?? 0,
      price_per_person: perPerson,
      total_price: total,
      currency: offer.pricing.currency,
      start_date: (offer.dates?.start ?? new Date().toISOString()).slice(0, 10),
      end_date: (offer.dates?.end ?? new Date().toISOString()).slice(0, 10),
      status: "confirmed",
      payment_status: paymentStatus,
      snapshot: {
        canonicalId: offer.canonicalId,
        sourceMode: offer.sourceMode,
        providerId: offer.providerId,
        providerOfferId: offer.providerOfferId,
        destination: offer.destination,
        dates: offer.dates,
        hotel: offer.hotel,
        flight: offer.flight,
        pricing: { ...offer.pricing, pricePerPerson: perPerson, totalPrice: base },
        cancellationPolicy: offer.hotel.cancellationPolicy,
        verifiedAt: resolution.verifiedAt,
        booking: {
          passengers: data.passengers,
          contact: data.contact,
          extras: lines,
          extrasTotal,
          payment: { method: data.paymentMethod, status: paymentStatus },
        },
      },
    } as never)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const again = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .eq("idempotency_key", data.idempotencyKey)
        .single();
      return { ok: true, booking: again.data! };
    }
    throw new Error(error.message);
  }

  if (paymentStatus === "paid") {
    try {
      await supabaseAdmin
        .from("payment_transactions")
        .update({ booking_id: row.id })
        .in("idempotency_key", [
          `${data.idempotencyKey}:authorize`,
          `${data.idempotencyKey}:capture`,
        ]);
    } catch {
      /* non-fatal */
    }
  }

  try {
    const { sendBookingConfirmationEmail } = await import("@/lib/messages.server");
    const reference = row.id.slice(0, 8).toUpperCase();
    const html = `
        <p>יעד: <b>${offer.destination.city}, ${offer.destination.country}</b></p>
        <p>מלון: ${offer.hotel.name}</p>
        <p>נוסעים: ${data.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}</p>
        <p>סה״כ לתשלום: ₪${Math.round(total).toLocaleString()}</p>
      `;
    await sendBookingConfirmationEmail({
      to: data.contact.email,
      userId,
      reference,
      html,
    });
  } catch (err) {
    const { logAppError } = await import("@/lib/app-errors.server");
    await logAppError({
      source: "app",
      message: `LIVE booking confirmation email failed: ${err instanceof Error ? err.message : String(err)}`,
      route: "placeLiveBooking",
      userId,
    }).catch(() => undefined);
  }

  return { ok: true, booking: row };
}

export const placeLiveBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => placeLiveBookingCore(data, context.userId));
