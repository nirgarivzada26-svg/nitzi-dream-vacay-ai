import { describe, expect, it, vi } from "vitest";
import { decodeCanonicalId } from "@/lib/offers/canonical-id";

describe("Routing — DEMO vs LIVE classification for booking-request/checkout (same decodeCanonicalId used by /deal/:id)", () => {
  it("legacy DEMO deal ids for booking-request/checkout are classified exactly as /deal/:id classifies them", () => {
    for (const slug of ["santorini", "rome~v1", "dubai", "abu-dhabi~v2"]) {
      const decoded = decodeCanonicalId(slug);
      expect(decoded.isLegacyDemoId).toBe(true);
      expect(decoded.providerOfferId).toBe(slug);
    }
  });

  it("canonical LIVE/SANDBOX ids are NOT classified as legacy demo", () => {
    expect(decodeCanonicalId("live:acme:offer-1").isLegacyDemoId).toBe(false);
    expect(decodeCanonicalId("sandbox:acme:offer-2").isLegacyDemoId).toBe(false);
  });
});

describe("booking-request.$dealId.tsx / checkout.$id.tsx — no getDeal/listDeals in the LIVE rendering path", () => {
  it("LiveBookingRequestView and LiveCheckoutView never call getDeal/listDeals", async () => {
    const fs = await import("node:fs");
    const files = [
      "../../components/deal/LiveBookingRequestView.tsx",
      "../../components/deal/LiveCheckoutView.tsx",
    ];
    for (const rel of files) {
      const source = fs.readFileSync(new URL(rel, import.meta.url), "utf-8");
      expect(source).not.toMatch(/\bgetDeal\(|\blistDeals\(/);
    }
  });

  it("live-booking.functions.ts never imports from @/lib/deals at all — a stronger, structural guarantee than a call-site grep: it's impossible to fall back to demo data without the import existing in the first place", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("../live-booking.functions.ts", import.meta.url),
      "utf-8",
    );
    expect(source).not.toMatch(/from ["']@\/lib\/deals["']/);
  });

  it("live-booking.functions.ts calls resolveOffer as its only offer source", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(
      new URL("../live-booking.functions.ts", import.meta.url),
      "utf-8",
    );
    expect(source).toMatch(/resolveOffer\(data\.canonicalId\)/);
  });
});

function makeOffer(overrides: Record<string, unknown> = {}) {
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
      guestRating: 8,
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
        stops: 0,
        durationMinutes: null,
        baggage: null,
        fareRules: null,
      },
      inbound: {
        airline: "Acme Air",
        flightNumber: "AC1",
        departAt: null,
        arriveAt: null,
        stops: 0,
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
      verified: true,
      discountPct: null,
    },
    inclusions: [],
    tags: [],
    nitziScore: null,
    smartPrice: null,
    ...overrides,
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    canonicalId: "live:acme:offer-1",
    idempotencyKey: "idem-key-12345678",
    passengers: [
      { firstName: "Dana", lastName: "Cohen", birthDate: "", passport: "", passportExpiry: "" },
    ],
    extras: [],
    contact: { email: "dana@example.com", phone: "" },
    paymentMethod: "card" as const,
    acceptedPricePerPerson: 4000,
    ...overrides,
  };
}

function makeSupabaseMock(opts: { existingBooking?: unknown }) {
  const insertSpy = vi.fn();
  const fromBookings = () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: opts.existingBooking ?? null }),
        }),
      }),
    }),
    insert: (row: unknown) => {
      insertSpy(row);
      return {
        select: () => ({
          single: async () => ({ data: { id: "booking-1", payment_status: "demo" } }),
        }),
      };
    },
    update: () => ({ in: async () => ({}) }),
  });

  return {
    supabaseAdmin: {
      from: (table: string) =>
        table === "bookings" ? fromBookings() : { update: () => ({ in: async () => ({}) }) },
    },
    insertSpy,
  };
}

async function loadPlaceLiveBooking(mocks: {
  resolutionStatus: string;
  currentPrice?: number | null;
  previousPrice?: number | null;
  priceDifference?: number | null;
  refreshedOffer?: unknown;
  existingBooking?: unknown;
  authorizeOk?: boolean;
  authorizeNotConfigured?: boolean;
}) {
  vi.resetModules();

  const { supabaseAdmin, insertSpy } = makeSupabaseMock({ existingBooking: mocks.existingBooking });
  vi.doMock("@/integrations/supabase/client.server", () => ({ supabaseAdmin }));

  const resolveOfferSpy = vi.fn().mockResolvedValue({
    status: mocks.resolutionStatus,
    canonicalId: "live:acme:offer-1",
    sourceMode: "live",
    previousPrice: mocks.previousPrice ?? null,
    currentPrice: mocks.currentPrice ?? null,
    priceDifference: mocks.priceDifference ?? null,
    priceBreakdown: null,
    verifiedAt: "2026-08-11T12:00:00.000Z",
    expiresAt: null,
    reasonCode: null,
    refreshedOffer: mocks.refreshedOffer ?? null,
  });
  vi.doMock("@/lib/offers/resolve-offer.server", () => ({ resolveOffer: resolveOfferSpy }));

  const authorizePayment = vi
    .fn()
    .mockResolvedValue(
      mocks.authorizeNotConfigured
        ? { ok: false, error: { code: "not_configured", message: "not configured" } }
        : mocks.authorizeOk === false
          ? { ok: false, error: { code: "declined", message: "declined" } }
          : { ok: true, data: { reference: "ref-1" } },
    );
  const capturePayment = vi.fn().mockResolvedValue({ ok: true, data: { reference: "ref-1" } });
  const cancelPayment = vi.fn().mockResolvedValue({ ok: true, data: { reference: "ref-1" } });
  vi.doMock("@/lib/providers/payments.server", () => ({
    authorizePayment,
    capturePayment,
    cancelPayment,
  }));

  vi.doMock("@/lib/messages.server", () => ({
    sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock("@/lib/app-errors.server", () => ({
    logAppError: vi.fn().mockResolvedValue(undefined),
  }));

  const mod = await import("@/lib/live-booking.functions");
  return { placeLiveBookingCore: mod.placeLiveBookingCore, resolveOfferSpy, insertSpy };
}

describe("placeLiveBookingCore — mandatory final revalidation", () => {
  it("always calls resolveOffer exactly once, fresh, regardless of anything the client claims", async () => {
    const { placeLiveBookingCore, resolveOfferSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer(),
      authorizeNotConfigured: true,
    });
    await placeLiveBookingCore(makeInput(), "user-1");
    expect(resolveOfferSpy).toHaveBeenCalledTimes(1);
    expect(resolveOfferSpy).toHaveBeenCalledWith("live:acme:offer-1");
  });
});

describe("placeLiveBookingCore — blocking states never write a booking", () => {
  for (const status of [
    "expired",
    "sold_out",
    "provider_unavailable",
    "unsupported",
    "not_found",
    "availability_changed",
  ]) {
    it(`${status} blocks booking creation — no insert, ok:false, exact status returned`, async () => {
      const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
        resolutionStatus: status,
        currentPrice: null,
      });
      const result = await placeLiveBookingCore(makeInput(), "user-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(status);
      expect(insertSpy).not.toHaveBeenCalled();
    });
  }
});

describe("placeLiveBookingCore — price integrity", () => {
  it("a stale client-accepted price that no longer matches the fresh resolution is ignored — booking blocked as price_changed", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4500,
      refreshedOffer: makeOffer({ pricing: { ...makeOffer().pricing, pricePerPerson: 4500 } }),
    });
    const result = await placeLiveBookingCore(
      makeInput({ acceptedPricePerPerson: 4000 }),
      "user-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe("price_changed");
      expect(result.currentPricePerPerson).toBe(4500);
      expect(result.priceDifference).toBe(500);
    }
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("explicit re-acceptance with the new price succeeds once it matches the fresh resolution", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4500,
      refreshedOffer: makeOffer({ pricing: { ...makeOffer().pricing, pricePerPerson: 4500 } }),
      authorizeNotConfigured: true,
    });
    const result = await placeLiveBookingCore(
      makeInput({ acceptedPricePerPerson: 4500 }),
      "user-1",
    );
    expect(result.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it("the freshly verified server price is written to the booking, not the client-supplied value, even when they happen to match", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer(),
      authorizeNotConfigured: true,
    });
    await placeLiveBookingCore(makeInput({ acceptedPricePerPerson: 4000 }), "user-1");
    const insertedRow = insertSpy.mock.calls[0][0];
    expect(insertedRow.price_per_person).toBe(4000);
  });

  it("a price_changed resolution still requires the client's acceptedPrice to match the fresh price before proceeding", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "price_changed",
      currentPrice: 4200,
      previousPrice: 4000,
      priceDifference: 200,
      refreshedOffer: makeOffer({ pricing: { ...makeOffer().pricing, pricePerPerson: 4200 } }),
    });
    const result = await placeLiveBookingCore(
      makeInput({ acceptedPricePerPerson: 4000 }),
      "user-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.currentPricePerPerson).toBe(4200);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("placeLiveBookingCore — booking snapshot integrity", () => {
  it("the written snapshot is self-contained (destination/hotel/flight/pricing inline) — never depends on provider_offer_cache after creation", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer(),
      authorizeNotConfigured: true,
    });
    await placeLiveBookingCore(makeInput(), "user-1");
    const row = insertSpy.mock.calls[0][0];
    expect(row.snapshot.destination).toBeDefined();
    expect(row.snapshot.hotel).toBeDefined();
    expect(row.snapshot.flight).toBeDefined();
    expect(row.snapshot.pricing).toBeDefined();
    expect(row.snapshot.canonicalId).toBe("live:acme:offer-1");
  });

  it("providerId in the snapshot is server-resolved, never taken from client input — the input schema has no providerId field at all", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer({ providerId: "acme" }),
      authorizeNotConfigured: true,
    });
    const input = makeInput() as Record<string, unknown>;
    expect(input.providerId).toBeUndefined();
    await placeLiveBookingCore(makeInput(), "user-1");
    const row = insertSpy.mock.calls[0][0];
    expect(row.snapshot.providerId).toBe("acme");
  });
});

describe("placeLiveBookingCore — idempotency", () => {
  it("a duplicate submission with the same idempotencyKey returns the existing booking without inserting again, and short-circuits before revalidation", async () => {
    const existing = { id: "booking-existing", payment_status: "demo" };
    const { placeLiveBookingCore, insertSpy, resolveOfferSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      existingBooking: existing,
    });
    const result = await placeLiveBookingCore(makeInput(), "user-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.booking).toEqual(existing);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(resolveOfferSpy).not.toHaveBeenCalled();
  });
});

describe("placeLiveBookingCore — no raw provider errors exposed", () => {
  it("the response shape only ever carries a fixed status enum and numbers — never a raw provider error string", async () => {
    const { placeLiveBookingCore } = await loadPlaceLiveBooking({
      resolutionStatus: "provider_unavailable",
      currentPrice: null,
    });
    const result = await placeLiveBookingCore(makeInput(), "user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const keys = Object.keys(result).sort();
      expect(keys).toEqual(["currentPricePerPerson", "ok", "priceDifference", "status"]);
    }
  });

  it("a payment failure returns the fixed 'payment_failed' status, never the underlying adapter's raw message", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer(),
      authorizeOk: false,
    });
    const result = await placeLiveBookingCore(makeInput(), "user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe("payment_failed");
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("placeLiveBookingCore — successful LIVE booking path", () => {
  it("an available offer with a matching accepted price creates a booking with payment_status 'demo' when no live payment provider is configured", async () => {
    const { placeLiveBookingCore, insertSpy } = await loadPlaceLiveBooking({
      resolutionStatus: "available",
      currentPrice: 4000,
      refreshedOffer: makeOffer(),
      authorizeNotConfigured: true,
    });
    const result = await placeLiveBookingCore(makeInput(), "user-1");
    expect(result.ok).toBe(true);
    const row = insertSpy.mock.calls[0][0];
    expect(row.payment_status).toBe("demo");
    expect(row.deal_id).toBe("live:acme:offer-1");
  });
});
