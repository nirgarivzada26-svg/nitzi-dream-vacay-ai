import { describe, expect, it } from "vitest";
import {
  cancellationDetail,
  cancellationSummary,
  derivePolicy,
  isFreeCancellation,
  type CancellationPolicy,
} from "@/lib/cancellation-policy";

/** Simple deterministic PRNG for tests — same seed always produces the same sequence. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const DEPARTURE = "2026-09-01T00:00:00.000Z";

describe("derivePolicy — deterministic generation", () => {
  it("produces the exact same policy for the same seed, every time", () => {
    const a = derivePolicy(seededRng(42));
    const b = derivePolicy(seededRng(42));
    expect(a).toEqual(b);
  });

  it("produces the same policy across many repeated calls with a fresh generator each time", () => {
    const results = Array.from({ length: 10 }, () => derivePolicy(seededRng(777)));
    for (const r of results) expect(r).toEqual(results[0]);
  });

  it("produces different policies for different seeds (not a constant)", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const kinds = new Set(seeds.map((s) => derivePolicy(seededRng(s)).kind));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("only ever produces one of the five defined policy kinds", () => {
    const validKinds = new Set(["free", "free_until", "partial", "non_refundable", "unknown"]);
    for (let s = 0; s < 50; s++) {
      const policy = derivePolicy(seededRng(s));
      expect(validKinds.has(policy.kind)).toBe(true);
    }
  });
});

describe("isFreeCancellation — always derived from the policy, never independent", () => {
  it("is true only for 'free' and 'free_until'", () => {
    expect(isFreeCancellation({ kind: "free" })).toBe(true);
    expect(isFreeCancellation({ kind: "free_until", deadlineDaysBeforeDeparture: 14 })).toBe(true);
  });

  it("is false for partial, non_refundable, and unknown", () => {
    expect(
      isFreeCancellation({ kind: "partial", refundPct: 50, deadlineDaysBeforeDeparture: 7 }),
    ).toBe(false);
    expect(isFreeCancellation({ kind: "non_refundable" })).toBe(false);
    expect(isFreeCancellation({ kind: "unknown" })).toBe(false);
  });

  it("agrees with derivePolicy's output for every seed — can never disagree by construction", () => {
    for (let s = 0; s < 50; s++) {
      const policy = derivePolicy(seededRng(s));
      const expectedFree = policy.kind === "free" || policy.kind === "free_until";
      expect(isFreeCancellation(policy)).toBe(expectedFree);
    }
  });
});

describe("cancellationSummary / cancellationDetail — honest, never over-claiming", () => {
  it("non_refundable wording never contains free-cancellation language", () => {
    const policy: CancellationPolicy = { kind: "non_refundable" };
    const summary = cancellationSummary(policy, DEPARTURE);
    const detail = cancellationDetail(policy, DEPARTURE);
    expect(summary).not.toMatch(/חינם/);
    expect(detail).not.toMatch(/חינם/);
    // Non-refundable must be explicit, not vague.
    expect(summary).toMatch(/לא ניתן לביטול|ללא החזר/);
    expect(detail).toMatch(/אינה ניתנת לביטול|אינה מזכה בהחזר/);
  });

  it("partial wording never contains free-cancellation language and is never labeled 'free cancellation'", () => {
    const policy: CancellationPolicy = {
      kind: "partial",
      refundPct: 50,
      deadlineDaysBeforeDeparture: 7,
    };
    const summary = cancellationSummary(policy, DEPARTURE);
    const detail = cancellationDetail(policy, DEPARTURE);
    expect(summary).not.toMatch(/ביטול חינם/);
    expect(detail).not.toMatch(/ביטול חינם/);
    expect(summary).toMatch(/50%/);
  });

  it("unknown/unverified renders honest unavailable wording, never implies refundability", () => {
    const policy: CancellationPolicy = { kind: "unknown" };
    const summary = cancellationSummary(policy, DEPARTURE);
    const detail = cancellationDetail(policy, DEPARTURE);
    expect(summary).not.toMatch(/חינם|החזר/);
    expect(detail).not.toMatch(/חינם|החזר/);
    expect(summary).toMatch(/טרם אומתה/);
  });

  it("free and free_until wording DOES clearly say free cancellation (positive control)", () => {
    expect(cancellationSummary({ kind: "free" }, DEPARTURE)).toMatch(/חינם/);
    expect(
      cancellationSummary({ kind: "free_until", deadlineDaysBeforeDeparture: 14 }, DEPARTURE),
    ).toMatch(/חינם/);
  });
});
