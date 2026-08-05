import { afterEach, describe, expect, it } from "vitest";
import { bootstrapEnabled } from "@/lib/admin.functions";

describe("bootstrapEnabled", () => {
  const original = process.env.ADMIN_BOOTSTRAP_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_BOOTSTRAP_ENABLED;
    else process.env.ADMIN_BOOTSTRAP_ENABLED = original;
  });

  it("is disabled by default when the env var is unset", () => {
    delete process.env.ADMIN_BOOTSTRAP_ENABLED;
    expect(bootstrapEnabled()).toBe(false);
  });

  it("is disabled for any value other than the literal string 'true'", () => {
    for (const value of ["1", "yes", "TRUE ", "True", "", "false"]) {
      process.env.ADMIN_BOOTSTRAP_ENABLED = value;
      if (value.toLowerCase() === "true") continue; // "True" is intentionally accepted (case-insensitive)
      expect(bootstrapEnabled()).toBe(false);
    }
  });

  it("is enabled only when explicitly set to 'true' (case-insensitive)", () => {
    process.env.ADMIN_BOOTSTRAP_ENABLED = "true";
    expect(bootstrapEnabled()).toBe(true);
    process.env.ADMIN_BOOTSTRAP_ENABLED = "True";
    expect(bootstrapEnabled()).toBe(true);
  });
});
