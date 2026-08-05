import { describe, expect, it } from "vitest";
import {
  MAX_APPROVED_INCREASE_RATIO,
  assertPassengerCountMatches,
  resolveConfirmedPerPerson,
} from "@/lib/booking-pricing";

describe("resolveConfirmedPerPerson", () => {
  it("uses the catalog price when no confirmed price was sent", () => {
    expect(resolveConfirmedPerPerson(1000, undefined)).toBe(1000);
  });

  it("uses the catalog price when the confirmed price is lower (client cannot pay less)", () => {
    expect(resolveConfirmedPerPerson(1000, 500)).toBe(1000);
  });

  it("accepts the confirmed price when it exactly matches the catalog price", () => {
    expect(resolveConfirmedPerPerson(1000, 1000)).toBe(1000);
  });

  it("accepts an approved increase within the allowed band", () => {
    expect(resolveConfirmedPerPerson(1000, 1200)).toBe(1200);
  });

  it("accepts an increase exactly at the boundary", () => {
    const boundary = 1000 * MAX_APPROVED_INCREASE_RATIO;
    expect(resolveConfirmedPerPerson(1000, boundary)).toBe(boundary);
  });

  it("falls back to the catalog price when the increase exceeds the allowed band", () => {
    const justOver = 1000 * MAX_APPROVED_INCREASE_RATIO + 1;
    expect(resolveConfirmedPerPerson(1000, justOver)).toBe(1000);
  });

  it("falls back to the catalog price for a wildly inflated confirmed price", () => {
    expect(resolveConfirmedPerPerson(1000, 1_000_000)).toBe(1000);
  });
});

describe("assertPassengerCountMatches", () => {
  it("does not throw when passenger count matches", () => {
    expect(() => assertPassengerCountMatches(2, 2)).not.toThrow();
  });

  it("throws when there are fewer passengers than the deal requires", () => {
    expect(() => assertPassengerCountMatches(1, 2)).toThrow();
  });

  it("throws when there are more passengers than the deal requires", () => {
    expect(() => assertPassengerCountMatches(3, 2)).toThrow();
  });
});
