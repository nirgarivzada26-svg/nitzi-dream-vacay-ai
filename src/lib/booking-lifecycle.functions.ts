// Booking lifecycle — server side only.
//
// `bookings` is not client-writable (RLS + grants), so cancellations and refund
// requests go through here. Ownership is re-checked server-side on every call
// and every transition is validated against the current row state.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().default(""),
});

/** Free cancellation flag is stored on the booking snapshot at purchase time. */
function freeCancellation(snapshot: unknown): boolean {
  const s = snapshot as { freeCancellation?: unknown } | null;
  return s?.freeCancellation === true;
}

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("ההזמנה לא נמצאה");
    if (row.status === "cancelled") throw new Error("ההזמנה כבר בוטלה");

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: data.reason || null,
        refund_status: freeCancellation(row.snapshot) ? "eligible" : "review",
      })
      .eq("id", row.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated;
  });

export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .select("id, status, refund_status")
      .eq("id", data.bookingId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("ההזמנה לא נמצאה");
    if (row.refund_status === "requested" || row.refund_status === "processing") {
      throw new Error("בקשת ההחזר כבר נמצאת בטיפול");
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({ refund_status: "requested", cancel_reason: data.reason || null })
      .eq("id", row.id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated;
  });
