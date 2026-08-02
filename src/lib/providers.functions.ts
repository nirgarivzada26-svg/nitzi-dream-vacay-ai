// Provider health — admin-only server functions.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProviderStatus } from "./providers/contracts";
import type { ProviderHealth } from "./providers/monitoring.server";

export interface ProviderDashboard {
  liveMode: boolean;
  statuses: ProviderStatus[];
  health: ProviderHealth;
}

export const getProviderDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ windowHours: z.number().int().min(1).max(168).default(24) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<ProviderDashboard> => {
    const admin = await import("./admin.server");
    await admin.requirePermission(context.userId, "settings");
    const registry = await import("./providers/live-registry.server");
    const monitoring = await import("./providers/monitoring.server");
    return {
      liveMode: registry.liveMode(),
      statuses: registry.providerStatuses(),
      health: await monitoring.buildProviderHealth(data.windowHours),
    };
  });
