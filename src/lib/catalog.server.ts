// Server-side read of the managed destination catalog.
// Used by both the public server function (catalog.functions.ts) and the
// AI agent search pipeline.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DestinationRow } from "./catalog";

const COLUMNS =
  "slug,name,country,country_code,flag,region,tagline,weather,flight_hours,avg_budget_per_person,matches,is_popular,has_offers,hotels,attractions,restaurants,itinerary,sort_order,city_en,country_en,subregion,airport_codes,latitude,longitude,timezone,currency,languages,image_url,short_description,best_travel_months,average_trip_duration,travel_categories,direct_flight_from_tlv,provider_supported,demo_supported,is_featured,is_trending";

export async function fetchDestinationRows(): Promise<DestinationRow[]> {
  const supabase = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("destinations")
    .select(COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as DestinationRow[];
}
