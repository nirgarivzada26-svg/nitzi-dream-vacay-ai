import { describe, expect, it } from "vitest";
import { toOrder } from "@/lib/admin.server";

interface BookingRecordShape {
  id: string;
  user_id: string;
  deal_id: string;
  destination_name: string;
  people: number;
  nights: number;
  total_price: number | string;
  currency: string;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  snapshot: unknown;
}

function record(over: Partial<BookingRecordShape> = {}): BookingRecordShape {
  return {
    id: "booking-1",
    user_id: "user-1",
    deal_id: "deal-1",
    destination_name: "סנטוריני",
    people: 2,
    nights: 5,
    total_price: 5000,
    currency: "ILS",
    status: "confirmed",
    payment_status: "demo",
    start_date: "2026-09-01",
    end_date: "2026-09-06",
    created_at: "2026-08-01T00:00:00Z",
    snapshot: { booking: { payment: { method: "card" } } },
    ...over,
  };
}

describe("toOrder — payment status is carried through honestly (C2)", () => {
  it("carries the real payment_status through as paymentStatus, distinct from paymentMethod", () => {
    const order = toOrder(record({ payment_status: "demo" }), new Map(), new Map());
    expect(order.paymentStatus).toBe("demo");
    // A payment method being present does NOT change the payment status —
    // this is exactly the bug being fixed: paymentMethod alone must never
    // imply the order was actually paid.
    expect(order.paymentMethod).toBe("card");
  });

  it("a demo order with a recorded payment method still reports paymentStatus 'demo', never 'paid'", () => {
    const order = toOrder(
      record({ payment_status: "demo", snapshot: { booking: { payment: { method: "card" } } } }),
      new Map(),
      new Map(),
    );
    expect(order.paymentStatus).not.toBe("paid");
    expect(order.paymentStatus).toBe("demo");
  });

  it("a genuinely paid order reports paymentStatus 'paid'", () => {
    const order = toOrder(record({ payment_status: "paid" }), new Map(), new Map());
    expect(order.paymentStatus).toBe("paid");
  });

  it("a failed order reports paymentStatus 'failed', not demo or paid", () => {
    const order = toOrder(record({ payment_status: "failed" }), new Map(), new Map());
    expect(order.paymentStatus).toBe("failed");
  });

  it("an order with no payment method recorded at all still carries a real paymentStatus", () => {
    const order = toOrder(record({ payment_status: "demo", snapshot: {} }), new Map(), new Map());
    expect(order.paymentMethod).toBeNull();
    expect(order.paymentStatus).toBe("demo");
  });
});
