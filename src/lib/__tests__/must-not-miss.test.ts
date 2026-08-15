import { describe, expect, it } from "vitest";
import {
  isEligibleForMustNotMiss,
  rankMustNotMissCandidates,
  reasonsForMustNotMiss,
  scoreMustNotMissOffer,
} from "@/lib/must-not-miss";
import type { CanonicalOffer } from "@/lib/offers/canonical-offer";

function makeOffer(overrides: Record<string, unknown> = {}): CanonicalOffer {
  return {
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    providerId: "acme",
    providerOfferId: "offer-1",
    verifiedAt: "2026-08-11T10:00:00.000Z",
    availabilityState: "available",
    destination: {
      slug: "santorini",
      city: "סנטוריני",
      country: "יוון",
      region: "אירופה",
      coords: null,
    },
    dates: { start: "2026-09-01T08:00:00.000Z", end: "2026-09-06T08:00:00.000Z", nights: 5 },
    hotel: {
      providerHotelId: "hotel-1",
      name: "Acme Hotel",
      stars: 4,
      guestRating: 7,
      roomRateRef: null,
      board: "unknown",
      cancellationPolicy: { kind: "unknown" },
      refundable: false,
      priceComponent: null,
    },
    flight: {
      outbound: {
        airline: "Acme Air",
        flightNumber: "AC1",
        departAt: null,
        arriveAt: null,
        stops: 1,
        durationMinutes: null,
        baggage: null,
        fareRules: null,
      },
      inbound: {
        airline: "Acme Air",
        flightNumber: "AC1",
        departAt: null,
        arriveAt: null,
        stops: 1,
        durationMinutes: null,
        baggage: null,
        fareRules: null,
      },
      priceComponent: null,
    },
    pricing: {
      pricePerPerson: 4000,
      totalPrice: 8000,
      currency: "ILS",
      taxesFees: null,
      extrasAvailable: false,
      verified: false,
      discountPct: null,
    },
    inclusions: [],
    tags: [],
    nitziScore: null,
    smartPrice: null,
    ...overrides,
  } as CanonicalOffer;
}

describe("isEligibleForMustNotMiss", () => {
  it("rejects an unavailable offer", () => {
    expect(isEligibleForMustNotMiss(makeOffer({ availabilityState: "unavailable" }))).toBe(false);
  });

  it("rejects a null or non-positive price", () => {
    expect(
      isEligibleForMustNotMiss(
        makeOffer({ pricing: { ...makeOffer().pricing, pricePerPerson: null } }),
      ),
    ).toBe(false);
    expect(
      isEligibleForMustNotMiss(
        makeOffer({ pricing: { ...makeOffer().pricing, pricePerPerson: 0 } }),
      ),
    ).toBe(false);
  });

  it("rejects missing canonical/provider identity", () => {
    expect(isEligibleForMustNotMiss(makeOffer({ canonicalId: "" }))).toBe(false);
    expect(isEligibleForMustNotMiss(makeOffer({ providerId: "" }))).toBe(false);
  });

  it("accepts a valid offer even with lots of unknown OPTIONAL fields — missing optional data never disqualifies", () => {
    const offer = makeOffer({
      hotel: {
        ...makeOffer().hotel,
        guestRating: null,
        board: "unknown",
        cancellationPolicy: { kind: "unknown" },
      },
      flight: null,
      pricing: { ...makeOffer().pricing, discountPct: null },
    });
    expect(isEligibleForMustNotMiss(offer)).toBe(true);
  });
});

describe("scoreMustNotMissOffer — never a negative claim from missing data", () => {
  it("a fully evidence-free offer scores 0, not a fabricated positive or negative", () => {
    const offer = makeOffer({
      hotel: {
        ...makeOffer().hotel,
        guestRating: null,
        cancellationPolicy: { kind: "unknown" },
      },
      flight: null,
      pricing: { ...makeOffer().pricing, discountPct: null, verified: false },
      nitziScore: null,
      smartPrice: null,
    });
    expect(scoreMustNotMissOffer(offer)).toBe(0);
  });

  it("a high real guest rating positively influences the score", () => {
    const base = scoreMustNotMissOffer(
      makeOffer({ hotel: { ...makeOffer().hotel, guestRating: 6 } }),
    );
    const high = scoreMustNotMissOffer(
      makeOffer({ hotel: { ...makeOffer().hotel, guestRating: 9.2 } }),
    );
    expect(high).toBeGreaterThan(base);
  });

  it("a real direct flight positively influences the score", () => {
    const connecting = scoreMustNotMissOffer(makeOffer());
    const direct = scoreMustNotMissOffer(
      makeOffer({
        flight: {
          outbound: { ...makeOffer().flight!.outbound, stops: 0 },
          inbound: { ...makeOffer().flight!.inbound, stops: 0 },
          priceComponent: null,
        },
      }),
    );
    expect(direct).toBeGreaterThan(connecting);
  });

  it("a real verified discount positively influences the score", () => {
    const noDiscount = scoreMustNotMissOffer(makeOffer());
    const discounted = scoreMustNotMissOffer(
      makeOffer({ pricing: { ...makeOffer().pricing, discountPct: 15 } }),
    );
    expect(discounted).toBeGreaterThan(noDiscount);
  });
});

describe("reasonsForMustNotMiss — never invents a reason", () => {
  it("unknown cancellation never produces 'free cancellation' text", () => {
    const reasons = reasonsForMustNotMiss(makeOffer()).join(" ");
    expect(reasons).not.toMatch(/ביטול חינם/);
  });

  it("null discount never produces discount language", () => {
    const reasons = reasonsForMustNotMiss(makeOffer()).join(" ");
    expect(reasons).not.toMatch(/מחיר חזק/);
  });

  it("missing flight (connecting, not direct) never produces 'direct flight' text", () => {
    const reasons = reasonsForMustNotMiss(makeOffer()).join(" ");
    expect(reasons).not.toMatch(/טיסה ישירה/);
  });

  it("falls back to honest neutral copy when no dramatic signal exists", () => {
    const reasons = reasonsForMustNotMiss(makeOffer());
    expect(reasons).toContain("הצעה בולטת מתוך המלאי שנבדק כרגע");
  });

  it("a genuinely direct flight does produce the real claim", () => {
    const reasons = reasonsForMustNotMiss(
      makeOffer({
        flight: {
          outbound: { ...makeOffer().flight!.outbound, stops: 0 },
          inbound: { ...makeOffer().flight!.inbound, stops: 0 },
          priceComponent: null,
        },
      }),
    ).join(" ");
    expect(reasons).toMatch(/טיסה ישירה/);
  });
});

describe("rankMustNotMissCandidates — eligibility, no-winner, and rotation", () => {
  it("returns an empty list when no offer has any genuine positive evidence", () => {
    const offers = [
      makeOffer({ canonicalId: "live:acme:1" }),
      makeOffer({ canonicalId: "live:acme:2" }),
    ];
    expect(rankMustNotMissCandidates(offers)).toEqual([]);
  });

  it("excludes sold-out/unavailable offers entirely from candidacy", () => {
    const strong = makeOffer({
      canonicalId: "live:acme:strong",
      hotel: { ...makeOffer().hotel, guestRating: 9.5 },
      availabilityState: "unavailable",
    });
    expect(rankMustNotMissCandidates([strong])).toEqual([]);
  });

  it("deterministic selection is stable within the same 24-hour bucket", () => {
    const offers = [
      makeOffer({ canonicalId: "live:acme:a", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
      makeOffer({ canonicalId: "live:acme:b", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
    ];
    const t1 = new Date("2026-08-11T01:00:00.000Z");
    const t2 = new Date("2026-08-11T23:00:00.000Z");
    const r1 = rankMustNotMissCandidates(offers, t1);
    const r2 = rankMustNotMissCandidates(offers, t2);
    expect(r1[0].canonicalId).toBe(r2[0].canonicalId);
  });

  it("rotation changes across day-buckets when multiple similarly-eligible candidates exist", () => {
    const offers = [
      makeOffer({ canonicalId: "live:acme:a", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
      makeOffer({ canonicalId: "live:acme:b", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
    ];
    const results = new Set<string>();
    for (let day = 0; day < 10; day++) {
      const t = new Date(Date.UTC(2026, 7, 1 + day, 12, 0, 0));
      results.add(rankMustNotMissCandidates(offers, t)[0].canonicalId);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("returns the full rotation-ordered fallback list, not just the winner", () => {
    const offers = [
      makeOffer({ canonicalId: "live:acme:a", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
      makeOffer({ canonicalId: "live:acme:b", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
      makeOffer({ canonicalId: "live:acme:c", hotel: { ...makeOffer().hotel, guestRating: 9 } }),
    ];
    const ordered = rankMustNotMissCandidates(offers);
    expect(ordered.length).toBe(3);
    expect(new Set(ordered.map((o) => o.canonicalId)).size).toBe(3);
  });
});
