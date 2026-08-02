// Commercial launch checklist — client-safe types.
//
// The Sprint 9 checklist proves the product works. This checklist proves the
// business may legally and operationally sell: company details, legal
// documents, production payments, messaging, supplier readiness,
// observability, backup/DR, security and the customer journey.

import type { LaunchCheck } from "./launch-types";

export const COMMERCIAL_GROUPS = [
  "business",
  "legal",
  "payments",
  "email",
  "sms",
  "suppliers",
  "observability",
  "backup",
  "security",
  "cx",
] as const;

export type CommercialGroupId = (typeof COMMERCIAL_GROUPS)[number];

export const COMMERCIAL_GROUP_LABELS: Record<CommercialGroupId, string> = {
  business: "מוכנות עסקית",
  legal: "מסמכים משפטיים",
  payments: "תשלומים",
  email: "אימייל",
  sms: "SMS / WhatsApp",
  suppliers: "מוכנות ספקים",
  observability: "ניטור ולוגים",
  backup: "גיבוי והתאוששות",
  security: "אבטחה",
  cx: "חוויית לקוח",
};

export interface CommercialGroup {
  id: CommercialGroupId;
  label: string;
  checks: LaunchCheck[];
}

export interface CommercialReport {
  ranAt: string;
  liveMode: boolean;
  gateOpen: boolean;
  totals: { pass: number; warn: number; fail: number };
  groups: CommercialGroup[];
  blockers: string[];
}

export interface CommercialGateRecord {
  open: boolean;
  ranAt: string;
  pass: number;
  warn: number;
  fail: number;
  blockers: string[];
}

/* --------------------------------------------------------- post launch */

export type AlertSeverity = "critical" | "high" | "info";

export interface MonitorAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  value: number;
  threshold: number;
}

export interface MonitorPulse {
  ranAt: string;
  windowHours: number;
  metrics: {
    bookings: number;
    failedBookings: number;
    payments: number;
    failedPayments: number;
    refunds: number;
    providerCalls: number;
    providerFailures: number;
    providerFailureRate: number;
    failedWebhooks: number;
    aiErrors: number;
    appErrors: number;
  };
  alerts: MonitorAlert[];
  notified: boolean;
}
