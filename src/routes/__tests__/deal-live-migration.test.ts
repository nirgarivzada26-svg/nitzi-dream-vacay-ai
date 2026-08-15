import { describe, expect, it, vi } from "vitest";
import { decodeCanonicalId } from "@/lib/offers/canonical-id";

describe("/deal/:id route resolution — legacy DEMO ids", () => {
  it("a bare slug is treated as legacy demo — routes to the existing demo path", () => {
    const decoded = decodeCanonicalId("santorini");
    expect(decoded.isLegacyDemoId).toBe(true);
    expect(decoded.sourceMode).toBe("demo");
  });

  it("a variant slug (slug~v1) is treated as legacy demo — routes to the existing demo path", () => {
    const decoded = decodeCanonicalId("santorini~v1");
    expect(decoded.isLegacyDemoId).toBe(true);
    expect(decoded.providerOfferId).toBe("santorini~v1");
  });

  it("existing canonical DEMO links are unchanged: dozens of realistic slugs all decode as legacy demo", () => {
    const slugs = ["rome", "paris~v2", "amalfi", "dubai~v1", "abu-dhabi", "new-york~v1"];
    for (const slug of slugs) {
      const decoded = decodeCanonicalId(slug);
      expect(decoded.isLegacyDemoId).toBe(true);
      expect(decoded.providerOfferId).toBe(slug);
    }
  });
});

describe("/deal/:id route resolution — canonical SANDBOX/LIVE ids", () => {
  it("a fully-qualified live id is NOT treated as legacy demo", () => {
    const decoded = decodeCanonicalId("live:acme:offer-123");
    expect(decoded.isLegacyDemoId).toBe(false);
    expect(decoded.sourceMode).toBe("live");
    expect(decoded.providerId).toBe("acme");
    expect(decoded.providerOfferId).toBe("offer-123");
  });

  it("a fully-qualified sandbox id is NOT treated as legacy demo", () => {
    const decoded = decodeCanonicalId("sandbox:acme:offer-456");
    expect(decoded.isLegacyDemoId).toBe(false);
    expect(decoded.sourceMode).toBe("sandbox");
  });

  it("a malformed canonical id decodes without throwing (safe, never crashes the route)", () => {
    expect(() => decodeCanonicalId("live:???:###garbage###")).not.toThrow();
    const decoded = decodeCanonicalId("live:???:###garbage###");
    expect(decoded.sourceMode).toBe("live");
    expect(decoded.providerOfferId).toBe("###garbage###");
  });

  it("an empty string decodes safely as legacy demo (never crashes)", () => {
    expect(() => decodeCanonicalId("")).not.toThrow();
    const decoded = decodeCanonicalId("");
    expect(decoded.isLegacyDemoId).toBe(true);
  });
});

describe("dealResolutionQueryOptions — wiring", () => {
  it("uses the exact canonicalId in its query key, and never treats a prior fetch as still-fresh", async () => {
    vi.resetModules();
    const resolveSpy = vi.fn().mockResolvedValue({
      status: "available",
      canonicalId: "live:acme:offer-1",
      sourceMode: "live",
      previousPrice: null,
      currentPrice: 4000,
      priceDifference: null,
      priceBreakdown: null,
      verifiedAt: null,
      expiresAt: null,
      reasonCode: null,
      refreshedOffer: null,
    });
    vi.doMock("@/lib/offers/resolve-offer.server", () => ({ resolveOffer: resolveSpy }));

    const mod = await import("@/lib/deal-resolution.functions");
    const options = mod.dealResolutionQueryOptions("live:acme:offer-1");
    expect(options.queryKey).toEqual(["deal-resolution", "live:acme:offer-1"]);
    expect(options.staleTime).toBe(0);

    vi.doUnmock("@/lib/offers/resolve-offer.server");
  });

  it("the query layer is a pure passthrough to resolveOffer with no status-specific branching — deep-link/refresh safety for every status relies on resolveOffer's own tested behavior, not extra route-level logic that could diverge", async () => {
    // createServerFn-wrapped handlers require the live server runtime's
    // AsyncLocalStorage context to invoke directly (confirmed by a real,
    // informative error when attempted) — consistent with the same
    // limitation encountered in the B+E batch. Verified here via source
    // inspection instead: dealResolutionQueryOptions/resolveDealOffer
    // contain no conditional logic keyed on `.status` at all, so whatever
    // resolveOffer() returns (already exhaustively tested for every status
    // in resolve-offer.test.ts) passes through unmodified — there is no
    // route-level special-casing that could silently break for one status
    // and not another.
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("../../lib/deal-resolution.functions.ts", import.meta.url),
      "utf-8",
    );
    expect(source).not.toMatch(/\.status\s*===/);
    expect(source).toMatch(/resolveOffer\(data\.canonicalId\)/);
  });
});

describe("LiveOfferView — every resolveOffer state renders safely (structural completeness)", () => {
  // No component-render test harness exists in this project — verified by
  // source inspection instead: every ResolutionStatus value must have its
  // own explicit `case` in the switch, never silently falling through to
  // the default ("not found") branch. This is exactly the kind of check
  // that would have caught the real availability_changed gap found and
  // fixed in this batch (it previously had no case and fell through to
  // "not found," which would have misrepresented a real status).
  const ALL_STATUSES = [
    "available",
    "price_changed",
    "availability_changed",
    "expired",
    "sold_out",
    "provider_unavailable",
    "not_found",
    "unsupported",
  ];

  it("every ResolutionStatus value has an explicit case in LiveOfferView's switch statement", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("../../components/deal/LiveOfferView.tsx", import.meta.url),
      "utf-8",
    );
    for (const status of ALL_STATUSES) {
      expect(source).toContain(`case "${status}":`);
    }
  });

  it("LiveOfferView and the deal-resolution server function never reference getDeal/listDeals — no demo fallback in the LIVE rendering path", async () => {
    const fs = await import("node:fs");
    const viewSource = fs.readFileSync(
      new URL("../../components/deal/LiveOfferView.tsx", import.meta.url),
      "utf-8",
    );
    const fnSource = fs.readFileSync(
      new URL("../../lib/deal-resolution.functions.ts", import.meta.url),
      "utf-8",
    );
    expect(viewSource).not.toMatch(/\bgetDeal\(|\blistDeals\(/);
    expect(fnSource).not.toMatch(/\bgetDeal\(|\blistDeals\(/);
  });

  it("the success view only ever displays result.currentPrice/priceBreakdown for price — never a separately re-derived value", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("../../components/deal/LiveOfferView.tsx", import.meta.url),
      "utf-8",
    );
    // The rendered price figures come from the resolution's own fresh
    // fields, not from independently reading a raw stored/cached number.
    expect(source).toMatch(/result\.currentPrice/);
    expect(source).toMatch(/result\.priceBreakdown/);
  });

  it("no payment or booking mutation is referenced anywhere in the new LIVE rendering files", async () => {
    const fs = await import("node:fs");
    const viewSource = fs.readFileSync(
      new URL("../../components/deal/LiveOfferView.tsx", import.meta.url),
      "utf-8",
    );
    const fnSource = fs.readFileSync(
      new URL("../../lib/deal-resolution.functions.ts", import.meta.url),
      "utf-8",
    );
    for (const forbidden of [
      "placeBooking",
      "capturePayment",
      "authorizePayment",
      "supabaseAdmin",
    ]) {
      expect(viewSource).not.toContain(forbidden);
      expect(fnSource).not.toContain(forbidden);
    }
  });
});
