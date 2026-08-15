import { describe, expect, it } from "vitest";
import { shouldShowDemoBanner } from "@/components/GlobalDemoBanner";

describe("shouldShowDemoBanner", () => {
  it("is false on the homepage — it already renders its own DemoDataNotice", () => {
    expect(shouldShowDemoBanner("/")).toBe(false);
  });

  it("is true on customer-facing travel/booking pages", () => {
    for (const path of [
      "/packages",
      "/flights",
      "/deal/santorini",
      "/hotel/some-hotel",
      "/flight/some-flight",
      "/destination/athens",
      "/compare",
      "/ai",
      "/ai/some-conversation-id",
      "/booking-request/santorini",
      "/checkout/santorini",
      "/account",
      "/booking/abc123",
    ]) {
      expect(shouldShowDemoBanner(path)).toBe(true);
    }
  });

  it("is false anywhere under /admin — the order list already shows real per-row payment status", () => {
    expect(shouldShowDemoBanner("/admin")).toBe(false);
    expect(shouldShowDemoBanner("/admin/orders")).toBe(false);
    expect(shouldShowDemoBanner("/admin/users")).toBe(false);
  });

  it("is false on /auth, /legal/*, /support, /api/*", () => {
    expect(shouldShowDemoBanner("/auth")).toBe(false);
    expect(shouldShowDemoBanner("/legal/terms")).toBe(false);
    expect(shouldShowDemoBanner("/support")).toBe(false);
    expect(shouldShowDemoBanner("/api/chat")).toBe(false);
  });

  it("does not false-positive-exclude a real path that merely starts with an excluded word", () => {
    // "/supporters" is not "/support" and should not be accidentally excluded.
    expect(shouldShowDemoBanner("/supporters")).toBe(true);
  });
});
