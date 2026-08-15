// Shared types for the admin dashboard. Client-safe (no server imports).

/** JSON-serializable value (server functions may only return serializable data). */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "support",
  "marketing",
  "content_manager",
  "finance",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "סופר אדמין",
  admin: "אדמין",
  support: "תמיכה",
  marketing: "שיווק",
  content_manager: "ניהול תוכן",
  finance: "כספים",
};

export const ADMIN_PERMISSIONS = [
  "dashboard",
  "analytics",
  "orders",
  "users",
  "packages",
  "flights",
  "notifications",
  "settings",
  "audit",
  "reports",
  "permissions",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: "לוח בקרה",
  analytics: "אנליטיקת חיפוש",
  orders: "הזמנות",
  users: "משתמשים",
  packages: "חבילות",
  flights: "טיסות",
  notifications: "התראות",
  settings: "הגדרות",
  audit: "יומן פעולות",
  reports: "דוחות",
  permissions: "הרשאות",
};

export interface AdminMe {
  userId: string;
  email: string | null;
  roles: AdminRole[];
  permissions: AdminPermission[];
  /** True when no staff member exists yet — the first signed-in user may claim. */
  needsBootstrap: boolean;
}

export interface DayPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface NamedCount {
  label: string;
  value: number;
  secondary?: number;
}

export interface AdminOrder {
  id: string;
  userId: string | null;
  customer: string;
  email: string | null;
  destination: string;
  dealId: string;
  people: number;
  nights: number;
  total: number;
  currency: string;
  status: string;
  /** 'paid' | 'demo' | 'failed' — the real payment state, never inferred from paymentMethod alone. */
  paymentStatus: string;
  paymentMethod: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  orders: number;
  favorites: number;
  spend: number;
  roles: AdminRole[];
  active: boolean;
}

export interface AdminOverview {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  activeUsers: number;
  newUsersToday: number;
  byDay: DayPoint[];
  topDestinations: NamedCount[];
  topPackages: NamedCount[];
  mostViewed: NamedCount[];
  latestOrders: AdminOrder[];
  latestUsers: AdminUserRow[];
}

export interface SearchAnalytics {
  totalSearches: number;
  topDestinations: NamedCount[];
  noResults: NamedCount[];
  noResultsCount: number;
  popularMonths: NamedCount[];
  popularBudgets: NamedCount[];
  popularAirports: NamedCount[];
}

export interface AdminPackageRow {
  slug: string;
  name: string;
  destination: string;
  country: string;
  hotel: string | null;
  price: number;
  previousPrice: number | null;
  stars: number | null;
  board: string | null;
  pool: boolean;
  beachDistance: string | null;
  active: boolean;
  hasOffers: boolean;
  nitziScore: number;
  smartPrice: "great" | "fair" | "wait" | "unknown";
  views: number;
  orders: number;
  conversionRate: number;
  featured: boolean;
}

export interface AdminFlightRow {
  id: string;
  provider: string;
  route: string;
  departAt: string;
  arriveAt: string;
  price: number;
  stops: number;
  cabin: string;
  enabled: boolean;
  lastUpdate: string;
}

export interface AdminAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  context: JsonValue;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  previousValue: JsonValue;
  newValue: JsonValue;
  ip: string | null;
  createdAt: string;
}

export interface SettingRow {
  key: string;
  value: JsonValue;
  isPublic: boolean;
  updatedAt: string;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}
