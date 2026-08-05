import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Loader2, ShieldCheck } from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { SignInModal } from "@/components/SignInModal";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { getDeal, revalidateDeal, type Deal } from "@/lib/deals";
import { applyAlternative, findAlternative } from "@/lib/deal-alternatives";
import { breakdownFor } from "@/lib/deal-pricing";
import { inclusionsFor } from "@/lib/deal-inclusions";
import { verificationFor } from "@/lib/deal-verification";
import { VerificationBadge } from "@/components/deal/VerificationBadge";
import { DealPriceBreakdown } from "@/components/deal/DealPriceBreakdown";
import { DealInclusions } from "@/components/deal/DealInclusions";
import { setAuthIntent, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/booking-request/$dealId")({
  validateSearch: (s: Record<string, unknown>) => ({
    flight: typeof s.flight === "string" ? s.flight : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `בקשת הזמנה — ${decodeURIComponent(params.dealId)} | NITZI` },
      {
        name: "description",
        content:
          "בקשת הזמנה ל-NITZI: המחיר והזמינות יאומתו מול ספק צד ג׳ לפני אישור סופי. לא מתבצע חיוב בשלב זה.",
      },
      { property: "og:title", content: "בקשת הזמנה — NITZI" },
      {
        property: "og:description",
        content: "אימות מחיר וזמינות מול הספק לפני אישור סופי. ללא חיוב בשלב זה.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: BookingRequestPage,
});

function BookingRequestPage() {
  const { dealId } = Route.useParams();
  const { flight } = Route.useSearch();
  const navigate = useNavigate();
  const catalog = useDestinations();
  const { isAuthenticated } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deal, setDeal] = useState<Deal | null>(null);

  const canonical = useMemo(() => getDeal(dealId, catalog), [dealId, catalog]);
  const configured = useMemo(
    () => (canonical ? applyAlternative(canonical, flight ?? null) : null),
    [canonical, flight],
  );

  useEffect(() => {
    let alive = true;
    if (!configured) return;
    setChecking(true);
    revalidateDeal(configured).then((res) => {
      if (!alive) return;
      setDeal(res.deal);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [configured]);

  if (!canonical || !configured) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">הדיל לא נמצא</h1>
          <Link to="/" className="mt-3 inline-block font-black text-primary underline">
            חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    );
  }

  const active = deal ?? configured;
  const v = verificationFor(active);
  const alt = findAlternative(canonical, flight ?? null);
  const breakdown = breakdownFor(active);

  const submit = () => {
    if (!isAuthenticated) {
      setAuthIntent(`/booking-request/${dealId}`);
      setSignInOpen(true);
      return;
    }
    navigate({ to: "/checkout/$id", params: { id: canonical.id } });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() =>
              navigate({
                to: "/deal/$id",
                params: { id: canonical.id },
                search: { flight: undefined },
              })}
            aria-label="חזרה לדיל"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>
          <NitziLogo />
          <span className="w-10" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-black sm:text-3xl">בקשת הזמנה</h1>
        <p className="text-sm text-muted-foreground">
          {active.title} · {active.people} נוסעים · {active.dates.nights} לילות
        </p>

        <VerificationBadge v={v} />

        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-black">אימות לפני שליחה</h2>
          <p className="mt-1 flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> בודקים מחיר וזמינות מול
                הספק…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> הבדיקה הושלמה.
                המחיר המוצג הוא המחיר שנבדק כעת.
              </>
            )}
          </p>
        </div>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-black">פירוט מחיר</h2>
          <DealPriceBreakdown b={breakdown} />
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-black">מה כלול בחבילה</h2>
          <DealInclusions items={inclusionsFor(active, alt)} />
        </section>

        <p className="flex items-start gap-2 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-[12px] font-semibold text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          המחיר והזמינות יאומתו מול ספק צד ג׳ לפני אישור סופי. לא יתבצע חיוב בשלב זה.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              סה״כ
            </div>
            <div className="text-xl font-black">
              ₪{Math.round(breakdown.totalCents / 100).toLocaleString("he-IL")}
            </div>
          </div>
          <button
            onClick={submit}
            disabled={!v.bookable || checking}
            className="ms-auto rounded-2xl bg-gradient-sunset px-6 py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
          >
            {v.bookable ? "שלח בקשת הזמנה" : "החבילה אינה זמינה כרגע"}
          </button>
        </div>
      </div>

      <SignInModal
        open={signInOpen}
        onClose={(signed) => {
          setSignInOpen(false);
          if (signed) submit();
        }}
        reason="כדי לשלוח בקשת הזמנה צריך חשבון NITZI."
      />
    </div>
  );
}
