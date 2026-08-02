// Booking creation — server side only.
//
// The browser may no longer INSERT into `bookings` (RLS + grants block it).
// This function rebuilds the deal from the managed catalog, recomputes the
// price and extras from server-side data, revalidates the offer, and writes
// the row with the service client. Anything the client sends about money is
// ignored.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EXTRA_IDS, computeExtras } from "@/lib/booking-extras";

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
});

export type PlaceBookingInput = z.infer<typeof inputSchema>;

export const placeBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { fetchDestinationRows } = await import("@/lib/catalog.server");
    const { rowToDestination } = await import("@/lib/catalog");
    const { getDeal, revalidateDeal } = await import("@/lib/deals");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const catalog = (await fetchDestinationRows()).map(rowToDestination);
    const deal = getDeal(data.dealId, catalog);
    if (!deal) throw new Error("הדיל אינו זמין יותר");

    // Re-check price/availability with the provider before writing anything.
    const reval = await revalidateDeal(deal);
    if (!reval.available) throw new Error("הדיל אזל מהמלאי");

    const perPerson = reval.newPricePerPerson ?? deal.price.perPerson;
    const people = deal.people;
    if (data.passengers.length !== people) {
      throw new Error("מספר הנוסעים אינו תואם את הדיל");
    }

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
        snapshot: {
          ...deal,
          price: { ...deal.price, perPerson, total: base },
          booking: {
            passengers: data.passengers,
            contact: data.contact,
            extras: lines,
            extrasTotal,
            payment: { method: data.paymentMethod },
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
    return row;
  });
