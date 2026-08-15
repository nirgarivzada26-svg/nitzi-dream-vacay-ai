import { FlaskConical } from "lucide-react";

/**
 * Decides whether the global demo banner should render for a given path.
 * Exported (pure, no React) so it's directly unit-testable.
 *
 * - Excludes "/" — the homepage already renders its own DemoDataNotice,
 *   and we must never show both at once.
 * - Excludes /admin/* — the admin order list (see admin/orders.tsx) already
 *   shows real, per-row payment_status; a blanket page banner there would
 *   be redundant noise for staff who need the granular truth, not a
 *   site-wide disclaimer.
 * - Excludes /auth, /legal/*, /support, /api/* — not travel/booking pages.
 * - Everything else in the customer-facing travel/booking experience shows it.
 */
export function shouldShowDemoBanner(pathname: string): boolean {
  if (pathname === "/") return false;
  const excludedPrefixes = ["/admin", "/auth", "/legal", "/support", "/api"];
  return !excludedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Renders in normal document flow (never fixed/sticky) at the very top of
 * the page, above each route's own content — including any sticky header
 * that route renders. Because it isn't fixed/sticky itself, it can never
 * overlap or cover navigation or a sticky CTA: it simply scrolls away like
 * any other content once the user scrolls past it.
 */
export function GlobalDemoBanner({ pathname }: { pathname: string }) {
  if (!shouldShowDemoBanner(pathname)) return null;

  return (
    <div dir="rtl" className="border-b border-amber-200/70 bg-amber-50 px-4 py-1.5 text-center">
      <p className="mx-auto flex max-w-[1600px] items-center justify-center gap-1.5 text-[11px] font-bold text-amber-900">
        <FlaskConical className="h-3 w-3 shrink-0" aria-hidden />
        סביבת הדגמה — הנתונים, הזמינות והתשלומים באתר אינם אמיתיים
      </p>
    </div>
  );
}
