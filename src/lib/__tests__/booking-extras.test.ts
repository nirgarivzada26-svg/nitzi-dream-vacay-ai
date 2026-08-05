import { describe, expect, it } from "vitest";
import { computeExtras } from "@/lib/booking-extras";

describe("computeExtras", () => {
  it("returns no lines and zero total when nothing is selected", () => {
    const { lines, total } = computeExtras([], 2);
    expect(lines).toEqual([]);
    expect(total).toBe(0);
  });

  it("multiplies a per-person extra by the number of people", () => {
    const { lines, total } = computeExtras(["bag"], 3);
    expect(lines).toEqual([{ id: "bag", label: "מזוודה 23 ק״ג", amount: 450 }]);
    expect(total).toBe(450);
  });

  it("does not multiply a per-booking extra by the number of people", () => {
    // "transfers" is priced at 0 and per-booking; it should never appear as
    // a billable line since computeExtras filters out zero-price extras.
    const { lines, total } = computeExtras(["transfers"], 4);
    expect(lines).toEqual([]);
    expect(total).toBe(0);
  });

  it("sums multiple selected extras correctly", () => {
    const { lines, total } = computeExtras(["bag", "insurance"], 2);
    expect(lines).toHaveLength(2);
    expect(total).toBe(150 * 2 + 120 * 2);
  });

  it("ignores duplicate ids in the selection", () => {
    const { lines, total } = computeExtras(["bag", "bag"], 2);
    expect(lines).toHaveLength(1);
    expect(total).toBe(300);
  });

  it("treats zero or negative people as at least 1 for per-person pricing", () => {
    const { total } = computeExtras(["bag"], 0);
    expect(total).toBe(150);
  });
});
