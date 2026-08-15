// Canonical ID scheme: `${sourceMode}:${providerId}:${providerOfferId}`.
//
// Backward compatibility is load-bearing: every existing DEMO URL
// (/deal/santorini, /deal/santorini~v1) must keep resolving exactly as
// before. A bare id with no recognized "mode:" prefix is legacy-demo
// shorthand — decodeCanonicalId treats it as `demo:nitzi-demo:{id}`.

import type { SourceMode } from "./canonical-offer";

export const DEMO_PROVIDER_ID = "nitzi-demo";

export interface DecodedCanonicalId {
  sourceMode: SourceMode;
  providerId: string;
  providerOfferId: string;
  /** True when the input had no mode prefix (a legacy DEMO route param). */
  isLegacyDemoId: boolean;
}

function isSourceMode(v: string): v is SourceMode {
  return v === "demo" || v === "sandbox" || v === "live";
}

/** Builds the canonicalId for a demo Deal — identical to today's dealIdFor()/deal.id, prefixed. */
export function demoCanonicalId(dealId: string): string {
  return `demo:${DEMO_PROVIDER_ID}:${dealId}`;
}

export function providerCanonicalId(
  sourceMode: SourceMode,
  providerId: string,
  providerOfferId: string,
): string {
  return `${sourceMode}:${providerId}:${providerOfferId}`;
}

/**
 * Decodes any id the app might see, including legacy bare DEMO slugs
 * (`santorini`, `santorini~v1`) which never had a prefix and must keep
 * working exactly as they do today — that's the whole point.
 */
export function decodeCanonicalId(id: string): DecodedCanonicalId {
  const parts = id.split(":");
  if (parts.length >= 3 && isSourceMode(parts[0])) {
    const [sourceMode, providerId, ...rest] = parts;
    return {
      sourceMode: sourceMode as SourceMode,
      providerId,
      providerOfferId: rest.join(":"),
      isLegacyDemoId: false,
    };
  }
  // No recognized prefix — legacy DEMO route param (bare slug or slug~vN).
  return {
    sourceMode: "demo",
    providerId: DEMO_PROVIDER_ID,
    providerOfferId: id,
    isLegacyDemoId: true,
  };
}
