// Application error log — server only.
//
// The commercial checklist and the monitoring pulse both measure "is the app
// actually erroring right now", which only works if errors are recorded. Every
// caller writes here through the admin client; the table is staff-readable.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AppErrorSource = "app" | "ai" | "api";

export async function logAppError(input: {
  source: AppErrorSource;
  message: string;
  route?: string | null;
  userId?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin.from("app_error_log").insert({
      source: input.source,
      message: input.message.slice(0, 2000),
      route: input.route ?? null,
      user_id: input.userId ?? null,
      context: (input.context ?? {}) as never,
    });
  } catch {
    // Never let logging break the request that was already failing.
  }
}
