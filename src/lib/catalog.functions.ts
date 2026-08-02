import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DestinationRow } from "./catalog";

/**
 * Public read of the managed destination catalog. Uses the publishable key so
 * the anon SELECT policy applies — no user session required, safe for SSR and
 * for public route loaders.
 */
export const listDestinationRows = createServerFn({ method: "GET" }).handler(
  async (): Promise<DestinationRow[]> => {
    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supabase
      .from("destinations")
      .select(
        "slug,name,country,country_code,flag,region,tagline,weather,flight_hours,avg_budget_per_person,matches,is_popular,has_offers,hotels,attractions,restaurants,itinerary,sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DestinationRow[];
  },
);
