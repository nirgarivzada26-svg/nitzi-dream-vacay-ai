ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS city_en text,
  ADD COLUMN IF NOT EXISTS country_en text,
  ADD COLUMN IF NOT EXISTS subregion text,
  ADD COLUMN IF NOT EXISTS airport_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS best_travel_months integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS average_trip_duration integer,
  ADD COLUMN IF NOT EXISTS travel_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS direct_flight_from_tlv boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_supported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_supported boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trending boolean NOT NULL DEFAULT false;

ALTER TABLE public.destinations
  DROP CONSTRAINT IF EXISTS destinations_latitude_valid,
  DROP CONSTRAINT IF EXISTS destinations_longitude_valid,
  DROP CONSTRAINT IF EXISTS destinations_country_code_valid,
  DROP CONSTRAINT IF EXISTS destinations_currency_valid,
  DROP CONSTRAINT IF EXISTS destinations_months_valid;

ALTER TABLE public.destinations
  ADD CONSTRAINT destinations_latitude_valid CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT destinations_longitude_valid CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  ADD CONSTRAINT destinations_country_code_valid CHECK (country_code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT destinations_currency_valid CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

CREATE UNIQUE INDEX IF NOT EXISTS destinations_city_country_uniq
  ON public.destinations (lower(city_en), country_code)
  WHERE city_en IS NOT NULL;
