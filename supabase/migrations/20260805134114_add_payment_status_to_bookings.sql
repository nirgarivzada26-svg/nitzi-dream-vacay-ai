-- Launch-blocker fix: `placeBooking` previously wrote every row as
-- status = 'confirmed' with no record of whether a real charge happened.
-- This column makes that explicit and queryable, without changing the
-- existing `status` (booking lifecycle) column or any RLS policy.
--
-- 'paid'   -> a configured payment provider authorized AND captured the charge.
-- 'demo'   -> no live payment provider is configured; booking was created
--             without any charge (current Demo Mode behaviour, now explicit).
-- 'failed' -> a payment provider is configured but the charge did not
--             succeed (this state should never reach `bookings` today,
--             since placeBooking aborts before insert on payment failure —
--             kept for completeness / future async payment flows).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'demo';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('paid', 'demo', 'failed'));

COMMENT ON COLUMN public.bookings.payment_status IS
  'Whether this booking was backed by a real captured payment (paid), created with no live payment provider configured (demo), or failed (failed).';
