// Credential resolution for live providers — server only.
//
// Adapters never read process.env at module scope; they call `env()` inside a
// handler. `configured()` is what the admin screen and the failover chain use
// to decide whether a provider may be tried at all.

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function missing(names: string[]): string[] {
  return names.filter((n) => !env(n));
}

export function configured(names: string[]): boolean {
  return names.length > 0 && missing(names).length === 0;
}

/** Comma-separated ordered preference list, e.g. NITZI_FLIGHT_PROVIDERS="amadeus,sabre". */
export function providerOrder(name: string, fallback: string[]): string[] {
  const raw = env(name);
  if (!raw) return fallback;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

/** Live mode is only on when explicitly enabled AND at least one adapter is configured. */
export function liveModeEnabled(): boolean {
  const raw = (env("NITZI_LIVE_MODE") ?? "false").toLowerCase();
  return raw === "true" || raw === "1";
}

export async function httpJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ status: number; body: unknown }> {
  const { timeoutMs = 12_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}
