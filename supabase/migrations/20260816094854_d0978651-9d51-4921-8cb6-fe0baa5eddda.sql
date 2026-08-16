ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'demo';
DO $$ BEGIN
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('paid','demo','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON COLUMN public.bookings.payment_status IS 'paid = real captured payment, demo = no live payment provider, failed = charge failed.';