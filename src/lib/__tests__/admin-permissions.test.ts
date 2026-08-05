import { beforeEach, describe, expect, it, vi } from "vitest";

// admin.server.ts imports supabaseAdmin from this module — mock it so
// permission logic can be tested without a real database.
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

/** Minimal chainable query-builder stub matching supabase-js's shape. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    then: (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

// Imported after the mock is registered so admin.server.ts picks it up.
const { rolesOf, permissionsOf, requirePermission, AdminError } =
  await import("@/lib/admin.server");

describe("rolesOf", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns the roles for a user", async () => {
    fromMock.mockImplementation(() =>
      makeBuilder({ data: [{ role: "admin" }, { role: "support" }], error: null }),
    );
    const roles = await rolesOf("user-1");
    expect(roles).toEqual(["admin", "support"]);
  });

  it("returns an empty array for a user with no staff role", async () => {
    fromMock.mockImplementation(() => makeBuilder({ data: [], error: null }));
    const roles = await rolesOf("user-1");
    expect(roles).toEqual([]);
  });

  it("throws an AdminError when the query fails", async () => {
    fromMock.mockImplementation(() =>
      makeBuilder({ data: null, error: { message: "connection lost" } }),
    );
    await expect(rolesOf("user-1")).rejects.toThrow(AdminError);
  });
});

describe("permissionsOf", () => {
  beforeEach(() => fromMock.mockReset());

  it("returns an empty array without querying when there are no roles", async () => {
    const perms = await permissionsOf([]);
    expect(perms).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns the distinct set of permissions granted to the given roles", async () => {
    fromMock.mockImplementation(() =>
      makeBuilder({
        data: [
          { permission: "dashboard", allowed: true },
          { permission: "orders", allowed: true },
          { permission: "orders", allowed: true }, // duplicate across roles
        ],
        error: null,
      }),
    );
    const perms = await permissionsOf(["admin", "support"]);
    expect(perms.sort()).toEqual(["dashboard", "orders"]);
  });
});

describe("requirePermission", () => {
  beforeEach(() => fromMock.mockReset());

  it("throws when the user has no staff roles at all", async () => {
    fromMock.mockImplementation(() => makeBuilder({ data: [], error: null }));
    await expect(requirePermission("user-1", "orders")).rejects.toThrow(AdminError);
  });

  it("throws when the user's roles don't grant the requested permission", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_roles") return makeBuilder({ data: [{ role: "support" }], error: null });
      // support role does not include "permissions" management
      return makeBuilder({ data: [{ permission: "orders" }], error: null });
    });
    await expect(requirePermission("user-1", "permissions")).rejects.toThrow(AdminError);
  });

  it("resolves with the user's roles when the permission is granted", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_roles")
        return makeBuilder({ data: [{ role: "super_admin" }], error: null });
      return makeBuilder({ data: [{ permission: "orders" }], error: null });
    });
    const roles = await requirePermission("user-1", "orders");
    expect(roles).toEqual(["super_admin"]);
  });

  it("never grants access purely because a permission check was attempted — a denied check always throws, never returns a falsy pass", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_roles")
        return makeBuilder({ data: [{ role: "marketing" }], error: null });
      return makeBuilder({ data: [], error: null });
    });
    await expect(requirePermission("user-1", "settings")).rejects.toThrow(AdminError);
  });
});
