// Public company profile — used by the legal pages and the footer.
//
// Reads system_settings.company_profile. No auth: these are the details a
// travel operator is legally required to publish.

import { createServerFn } from "@tanstack/react-start";
import type { CompanyProfile } from "./company";

export const getCompanyProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompanyProfile> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeCompany } = await import("./company");
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "company_profile")
      .maybeSingle();
    return normalizeCompany(data?.value ?? null);
  },
);
