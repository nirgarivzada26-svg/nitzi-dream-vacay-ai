// Pure booking price/validation helpers.
//
// Extracted from bookings.functions.ts so this logic can be unit-tested
// without mocking Supabase or the payment providers. No server-only imports.

/**
 * The client may only ever push the per-person price UP from the catalog
 * price it originally quoted (the "price went up, user approved it" re-
 * validation flow), and only within a bounded band. Anything else falls
 * back to the server's own catalog price — the client can never make
 * itself pay less than the catalog says, and can never approve an
 * arbitrarily large increase.
 */
export const MAX_APPROVED_INCREASE_RATIO = 1.25;

export function resolveConfirmedPerPerson(
  catalogPerPerson: number,
  confirmedPerPerson: number | undefined,
): number {
  if (
    confirmedPerPerson !== undefined &&
    confirmedPerPerson >= catalogPerPerson &&
    confirmedPerPerson <= catalogPerPerson * MAX_APPROVED_INCREASE_RATIO
  ) {
    return confirmedPerPerson;
  }
  return catalogPerPerson;
}

/** Throws unless the number of passengers submitted matches the deal's people count. */
export function assertPassengerCountMatches(passengerCount: number, expectedPeople: number): void {
  if (passengerCount !== expectedPeople) {
    throw new Error("מספר הנוסעים אינו תואם את הדיל");
  }
}
