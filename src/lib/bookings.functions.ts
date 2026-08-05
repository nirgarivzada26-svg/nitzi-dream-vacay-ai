// Booking creation — server side only.
//
// The browser may no longer INSERT into `bookings` (RLS + grants block it).
// This function rebuilds the deal from the managed catalog, recomputes the
// price and extras from server-side data, revalidates the offer, and writes
// the row with the service client. Anything the client sends about money is
// ignored.
//
// Payment: before any row is written, a real charge is attempted through the
// payment-provider chain (see providers/payments.server.ts). Three outcomes:
//  - No live payment provider is configured (current Demo Mode / no Stripe
//    keys set) -> no charge is possible, so none is attempted; the booking is
//    written with payment_status: "demo" so this is explicit and queryable,
//    never silently indistinguishable from a real paid booking.
//  - A provider is configured and the authorize+capture succeed -> the
//    booking is written with payment_status: "paid".
//  - A provider is configured and the charge fails -> the function throws
//    and NO booking row is written at all. A booking must never be marked
//    "confirmed" for a charge that did not happen when a real provider was
//    available to attempt it on.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTRA_IDS, computeExtras } from "@/lib/booking-extras";
import { assertPassengerCountMatches, resolveConfirmedPerPerson } from "@/lib/booking-pricing";

const passengerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.string().trim().max(20).optional().default(""),
  passport: z.string().trim().max(30).optional().default(""),
  passportExpiry: z.string().trim().max(20).optional().default(""),
});

const inputSchema = z.object({
  dealId: z.string().trim().min(1).max(200),
  idempotencyKey: z.string().trim().min(8).max(100),
  passengers: z.array(passengerSchema).min(1).max(9),
  extras: z.array(z.enum(EXTRA_IDS)).max(EXTRA_IDS.length).default([]),
  contact: z.object({
    email: z.string().trim().email().max(160),
    phone: z.string().trim().max(40).optional().default(""),
  }),
  paymentMethod: z.enum(["card", "apple", "google", "bit"]),
  // Price the user approved at the revalidation step. Only accepted when it is
  // at least the catalog price (an approved increase) and within a sane band.
  confirmedPerPerson: z.number().finite().positive().max(1_000_000).optional(),
});

export type PlaceBookingInput = z.infer<typeof inputSchema>;

export const placeBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { fetchDestinationRows } = await import("@/lib/catalog.server");
    const { rowToDestination } = await import("@/lib/catalog");
    const { getDeal } = await import("@/lib/deals");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { authorizePayment, capturePayment, cancelPayment } =
      await import("@/lib/providers/payments.server");

    const catalog = (await fetchDestinationRows()).map(rowToDestination);
    const deal = getDeal(data.dealId, catalog);
    if (!deal) throw new Error("הדיל אינו זמין יותר");

    const catalogPerPerson = deal.price.perPerson;
    const perPerson = resolveConfirmedPerPerson(catalogPerPerson, data.confirmedPerPerson);
    const people = deal.people;
    assertPassengerCountMatches(data.passengers.length, people);

    const base = perPerson * people;
    const { lines, total: extrasTotal } = computeExtras(data.extras, people);
    const total = base + extrasTotal;

    const existing = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("user_id", context.userId)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data) return existing.data;

    // Attempt a real charge. When no live payment provider is configured this
    // returns a "not_configured" failure and we fall through to the demo
    // path below — no charge is possible, so none is claimed to have happened.
    const authResult = await authorizePayment({
      amount: total,
      currency: deal.price.currency,
      idempotencyKey: data.idempotencyKey,
      userId: context.userId,
      method: data.paymentMethod,
      description: `NITZI · ${deal.destination.name} · ${people} נוסעים`,
    });

    const providerConfigured = authResult.ok || authResult.error.code !== "not_configured";
    let paymentStatus: "paid" | "demo" = "demo";

    if (providerConfigured) {
      if (!authResult.ok) {
        throw new Error(`החיוב נכשל: ${authResult.error.message}`);
      }
      const captureResult = await capturePayment({
        amount: total,
        currency: deal.price.currency,
        idempotencyKey: data.idempotencyKey,
        userId: context.userId,
        method: data.paymentMethod,
        reference: authResult.data.reference,
      });
      if (!captureResult.ok) {
        // Authorization succeeded but capture didn't — release the hold
        // rather than leaving money in limbo, then fail the booking.
        await cancelPayment({
          amount: total,
          currency: deal.price.currency,
          idempotencyKey: data.idempotencyKey,
          userId: context.userId,
          reference: authResult.data.reference,
        }).catch(() => {
          /* best-effort release; the payment ledger still has the failed capture recorded */
        });
        throw new Error(`אישור החיוב נכשל: ${captureResult.error.message}`);
      }
      paymentStatus = "paid";
    }

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: context.userId,
        idempotency_key: data.idempotencyKey,
        deal_id: deal.id,
        destination_name: deal.destination.name,
        people,
        nights: deal.dates.nights,
        price_per_person: perPerson,
        total_price: total,
        currency: deal.price.currency,
        start_date: deal.dates.start.slice(0, 10),
        end_date: deal.dates.end.slice(0, 10),
        status: "confirmed",
        payment_status: paymentStatus,
        snapshot: {
          ...deal,
          price: { ...deal.price, perPerson, total: base },
          booking: {
            passengers: data.passengers,
            contact: data.contact,
            extras: lines,
            extrasTotal,
            payment: { method: data.paymentMethod, status: paymentStatus },
          },
        } as unknown as never,
      })
      .select("*")
      .single();

    if (error) {
      // Unique violation = a parallel submit already created it.
      if (error.code === "23505") {
        const again = await supabaseAdmin
          .from("bookings")
          .select("*")
          .eq("user_id", context.userId)
          .eq("idempotency_key", data.idempotencyKey)
          .single();
        return again.data!;
      }
      throw new Error(error.message);
    }

    // Best-effort: link the payment ledger rows (written under the booking
    // idempotency key, before this row existed) to the booking they paid for.
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
        /* non-fatal: the transactions still exist, just unlinked from this booking row */
      }
    }

    // Send the booking confirmation email. Awaited (not fire-and-forget) —
    // this app's fetch(request, env, ctx) entry point (src/server.ts) gives no
    // guarantee that work started after the response is returned actually
    // runs to completion on every runtime, so we send before returning.
    // Failure here never fails the booking itself: it's caught, logged to
    // app_error_log for admins, and the booking is still returned to the
    // customer. The email provider's own failover/logging (notification_log)
    // handles retries/visibility on the sending side.
    try {
      const { sendBookingConfirmationEmail } = await import("@/lib/messages.server");
      const reference = row.id.slice(0, 8).toUpperCase();
      const html = `
        <p>יעד: <b>${deal.destination.name}, ${deal.destination.country}</b></p>
        <p>תאריכים: ${deal.dates.start.slice(0, 10)} – ${deal.dates.end.slice(0, 10)} (${deal.dates.nights} לילות)</p>
        <p>מלון: ${deal.hotel.name}</p>
        <p>נוסעים: ${data.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}</p>
        <p>סה״כ לתשלום: ₪${Math.round(total).toLocaleString()}</p>
      `;
      await sendBookingConfirmationEmail({
        to: data.contact.email,
        userId: context.userId,
        reference,
        html,
      });
    } catch (err) {
      const { logAppError } = await import("@/lib/app-errors.server");
      await logAppError({
        source: "app",
        message: `booking confirmation email failed: ${err instanceof Error ? err.message : String(err)}`,
        route: "placeBooking",
        userId: context.userId,
      }).catch(() => undefined);
    }

    return row;
  });
