// Company (business) details — client-safe.
//
// The values live in system_settings.company_profile and are edited from the
// admin settings screen. Nothing here is hardcoded: an empty field simply
// blocks the commercial launch gate and is shown as "לא הוגדר" in the UI.

export interface CompanyProfile {
  business_name: string;
  tax_id: string;
  address: string;
  support_email: string;
  support_phone: string;
  refund_contact: string;
  legal_contact: string;
}

export const EMPTY_COMPANY: CompanyProfile = {
  business_name: "",
  tax_id: "",
  address: "",
  support_email: "",
  support_phone: "",
  refund_contact: "",
  legal_contact: "",
};

export const COMPANY_FIELD_LABELS: Record<keyof CompanyProfile, string> = {
  business_name: "שם העסק",
  tax_id: "ח.פ / עוסק מורשה",
  address: "כתובת העסק",
  support_email: "אימייל תמיכה",
  support_phone: "טלפון תמיכה",
  refund_contact: "איש קשר להחזרים",
  legal_contact: "איש קשר משפטי",
};

export function normalizeCompany(value: unknown): CompanyProfile {
  const v = (value ?? {}) as Partial<Record<keyof CompanyProfile, unknown>>;
  const out = { ...EMPTY_COMPANY };
  (Object.keys(EMPTY_COMPANY) as (keyof CompanyProfile)[]).forEach((k) => {
    out[k] = typeof v[k] === "string" ? (v[k] as string).trim() : "";
  });
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^\+?[\d\s-]{9,}$/;

/** Returns a human message per invalid field, empty when the profile is complete. */
export function companyIssues(p: CompanyProfile): Partial<Record<keyof CompanyProfile, string>> {
  const issues: Partial<Record<keyof CompanyProfile, string>> = {};
  if (p.business_name.length < 2) issues.business_name = "חסר שם עסק רשמי";
  if (!/^\d{8,9}$/.test(p.tax_id.replace(/\D/g, ""))) issues.tax_id = "מספר ח.פ / עוסק אינו תקין";
  if (p.address.length < 8) issues.address = "כתובת עסק חסרה או קצרה מדי";
  if (!EMAIL_RE.test(p.support_email)) issues.support_email = "אימייל תמיכה אינו תקין";
  if (!PHONE_RE.test(p.support_phone)) issues.support_phone = "טלפון תמיכה אינו תקין";
  if (!EMAIL_RE.test(p.refund_contact)) issues.refund_contact = "כתובת החזרים אינה תקינה";
  if (!EMAIL_RE.test(p.legal_contact)) issues.legal_contact = "כתובת קשר משפטי אינה תקינה";
  return issues;
}

export function isCompanyComplete(p: CompanyProfile): boolean {
  return Object.keys(companyIssues(p)).length === 0;
}
