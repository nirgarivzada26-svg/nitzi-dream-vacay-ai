// Lovable AI Gateway provider (server-only).
// All model calls go through here so the API key, prompts and tools never
// reach the browser.

import { createOpenAI } from "@ai-sdk/openai";

export interface RunIdFetch {
  fetch: typeof fetch;
  readonly runId: string | null;
}

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Captures / resends the gateway run id across every request in one turn. */
export function createLovableAiGatewayRunIdFetch(initial?: string | null): RunIdFetch {
  let runId: string | null = initial ?? null;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set(RUN_ID_HEADER, runId);
    const res = await fetch(input as RequestInfo, { ...init, headers });
    const got = res.headers.get(RUN_ID_HEADER);
    if (got) runId = got;
    return res;
  };
  return {
    fetch: wrapped,
    get runId() {
      return runId;
    },
  };
}

export function getLovableAiGatewayRunId(request: Request): string | null {
  return request.headers.get(RUN_ID_HEADER);
}

export function getLovableAiGatewayResponseHeaders(
  _unused?: unknown,
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...(extra ?? {}) };
}

export function withLovableAiGatewayRunIdHeader(response: Response, runIdFetch: RunIdFetch): Response {
  if (!runIdFetch.runId) return response;
  const headers = new Headers(response.headers);
  headers.set(RUN_ID_HEADER, runIdFetch.runId);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** OpenAI-compatible provider bound to the Lovable AI Gateway. */
export function createNitziAiProvider(apiKey: string, runIdFetch: RunIdFetch) {
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });
}
