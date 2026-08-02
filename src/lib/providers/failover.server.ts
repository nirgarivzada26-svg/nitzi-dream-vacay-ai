// Failover chain — server only.
//
// Tries the configured providers in preference order, instruments each call,
// and moves to the next provider only when the failure is retryable. When no
// provider succeeds the caller receives the last error and the UI shows
// "לא זמין כרגע" — never invented inventory.

import type { ProviderKind, ProviderResult } from "./contracts";
import { providerFail } from "./contracts";
import { instrument } from "./monitoring.server";

export interface ChainMember<A> {
  id: string;
  adapter: A;
  configured: boolean;
}

export async function runWithFailover<A, T>(
  kind: ProviderKind,
  operation: string,
  chain: ChainMember<A>[],
  call: (adapter: A) => Promise<ProviderResult<T>>,
  context?: Record<string, unknown>,
): Promise<ProviderResult<T>> {
  const usable = chain.filter((c) => c.configured);
  if (usable.length === 0) {
    return providerFail<T>("none", {
      code: "not_configured",
      message: "לא הוגדר ספק פעיל עבור הפעולה הזו",
      retryable: false,
    });
  }

  let last: ProviderResult<T> | null = null;
  for (const member of usable) {
    const result = await instrument<T>(
      { kind, providerId: member.id, operation, context },
      () => call(member.adapter),
    );
    if (result.ok) return result;
    last = result;
    if (!result.error.retryable) break;
  }
  return (
    last ??
    providerFail<T>("none", { code: "upstream_error", message: "כל הספקים נכשלו", retryable: false })
  );
}
