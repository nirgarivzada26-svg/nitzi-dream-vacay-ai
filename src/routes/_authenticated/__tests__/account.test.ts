import { describe, expect, it } from "vitest";
import { priceAlertState } from "@/routes/_authenticated/account";

describe("priceAlertState — honest, deterministic, never a fabricated live movement", () => {
  it("is 'unavailable' when the deal no longer resolves in the catalog", () => {
    expect(priceAlertState(null, 3000)).toBe("unavailable");
  });

  it("is 'reached' when the current catalog price is at or below the target", () => {
    expect(priceAlertState(2500, 3000)).toBe("reached");
    expect(priceAlertState(3000, 3000)).toBe("reached");
  });

  it("is 'pending' when the current catalog price is still above the target", () => {
    expect(priceAlertState(3500, 3000)).toBe("pending");
  });
});
