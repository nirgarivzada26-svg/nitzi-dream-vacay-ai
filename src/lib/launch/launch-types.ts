// Client-safe types for the Sprint 9 launch checklist.
//
// The checklist is executable: every item below is produced by really running
// the corresponding code path on the server (see launch-checks.server.ts).
// Nothing here is hardcoded to "pass".

export type LaunchStatus = "pass" | "warn" | "fail";

export interface LaunchCheck {
  id: string;
  label: string;
  status: LaunchStatus;
  /** What was actually observed when the check ran. */
  detail: string;
  /** What must be done when the check is not green. */
  remediation: string | null;
  durationMs: number;
}

export interface LaunchGroup {
  id: LaunchGroupId;
  label: string;
  checks: LaunchCheck[];
}

export const LAUNCH_GROUPS = [
  "flights",
  "hotels",
  "packages",
  "checkout",
  "payments",
  "user",
  "admin",
  "ai",
] as const;

export type LaunchGroupId = (typeof LAUNCH_GROUPS)[number];

export const LAUNCH_GROUP_LABELS: Record<LaunchGroupId, string> = {
  flights: "טיסות",
  hotels: "מלונות",
  packages: "חבילות",
  checkout: "צ׳קאאוט",
  payments: "תשלומים",
  user: "משתמש",
  admin: "ניהול",
  ai: "AI",
};

export interface LaunchReport {
  ranAt: string;
  liveMode: boolean;
  /** Live mode is only permitted when this is true. */
  gateOpen: boolean;
  totals: { pass: number; warn: number; fail: number };
  groups: LaunchGroup[];
  /** Human summary of what blocks the launch, empty when the gate is open. */
  blockers: string[];
}
