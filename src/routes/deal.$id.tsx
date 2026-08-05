import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Heart,
  ListChecks,
  MapPin,
  Plane,
  Share2,
  Shield,
  Scale,
  PiggyBank,
  Sparkles,
  ThermometerSun,
  Users,
  Star,
  Wallet,
} from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";
import { SignInModal } from "@/components/SignInModal";
import {
  boardLabels,
  getDeal,
  revalidateDeal,
  type Deal,
  type RevalidationResult,
} from "@/lib/deals";
import { setAuthIntent, useAuth } from "@/lib/auth";
import { addFavorite, isDealFavorited, removeFavorite } from "@/lib/user-data";
import { TripTimeline } from "@/components/TripTimeline";
import { recordViewedDeal } from "@/lib/recently-viewed";
import { SmartPriceBadge } from "@/components/SmartPriceBadge";
import { PriceAlertButton } from "@/components/PriceAlertButton";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { DestinationImage } from "@/components/DestinationImage";
import { VerificationBadge } from "@/components/deal/VerificationBadge";
import { DealExplanation } from "@/components/deal/DealExplanation";
import { DealFlightSection } from "@/components/deal/DealFlightSection";
import { DealFlightAlternatives } from "@/components/deal/DealFlightAlternatives";
import { DealMap } from "@/components/deal/DealMap";
import { DealInclusions } from "@/components/deal/DealInclusions";
import { DealPriceBreakdown } from "@/components/deal/DealPriceBreakdown";
import { verificationFor } from "@/lib/deal-verification";
import { breakdownFor } from "@/lib/deal-pricing";
import { inclusionsFor } from "@/lib/deal-inclusions";
import {
  RECOMMENDED_ALTERNATIVE_ID,
  applyAlternative,
  findAlternative,
} from "@/lib/deal-alternatives";
import { nitziScore } from "@/lib/deal-score";
import { dealVariantsFor } from "@/lib/deals";
import { SIMILAR_LABEL, similarDeals } from "@/lib/similar-deals";
import { ConciergeItinerary } from "@/components/deal/ConciergeItinerary";
import { ConciergeCost } from "@/components/deal/ConciergeCost";
import {
  ConciergeAudience,
  ConciergeExperience,
  ConciergeWeather,
} from "@/components/deal/ConciergeProfile";
import {
  ConciergeAlternatives,
  ConciergeClosing,
  ConciergeSavings,
} from "@/components/deal/ConciergeExtras";
import { ScoreBreakdownPanel } from "@/components/deal/ScoreBreakdownPanel";
import { DealComparison } from "@/components/deal/DealComparison";
import { BookTimingCard } from "@/components/deal/BookTimingCard";
import { TravelTips } from "@/components/deal/TravelTips";
import { scoreBreakdown } from "@/lib/deal-scores";
import { buildComparisons } from "@/lib/deal-comparison";
import { bookTiming } from "@/lib/book-timing";

export const Route = createFileRoute("/deal/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    flight: typeof s.flight === "string" ? s.flight : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `דיל ל${decodeURIComponent(params.id)} — NITZI` },
      {
        name: "description",
        content: `חבילת נופש מלאה ל${decodeURIComponent(params.id)}: טיסות, מלון, מסלול, פירוט מחיר מלא ומצב אימות שקוף.`,
      },
      { property: "og:title", content: `דיל ל${decodeURIComponent(params.id)} — NITZI` },
      {
        property: "og:description",
        content: "טיסה + מלון + מסלול, עם פירוט מחיר מלא ומצב אימות שקוף.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: DealPage,
});

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "short", year: "numeric" });

function agoLabel(iso: string | null, now: number | null) {
  if (!iso || now === null) return "עכשיו";
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `לפני ${s} שנ׳`;
  const m = Math.floor(s / 60);
  if (m < 60) return `לפני ${m} דק׳`;
  return `לפני ${Math.floor(m / 60)} ש׳`;
}

function DealPage() {
  const { id } = Route.useParams();
  const { flight } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const catalog = useDestinations();

  const [refreshed, setRefreshed] = useState<Deal | null>(null);
  const [revalidation, setRevalidation] = useState<RevalidationResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "book" | null>(null);

  const canonical = useMemo(() => getDeal(id, catalog), [id, catalog]);
  const selectedFlightId = flight ?? RECOMMENDED_ALTERNATIVE_ID;
  const configured = useMemo(
    () => (canonical ? applyAlternative(refreshed ?? canonical, selectedFlightId) : null),
    [canonical, refreshed, selectedFlightId],
  );

  const savedQ = useQuery({
    queryKey: ["fav", id],
    queryFn: () => isDealFavorited(id),
    enabled: isAuthenticated,
  });

  useEffect(() => setNow(Date.now()), []);
  useEffect(() => {
    if (configured) recordViewedDeal(configured.id);
  }, [configured]);

  if (!canonical || !configured) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-black">הדיל לא נמצא</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ייתכן שהדיל התחלף או שהקישור פג תוקף.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white shadow-glow"
          >
            חזרה לבית
          </Link>
        </div>
      </div>
    );
  }

  const deal = configured;
  const dest = deal.destination;
  const v = verificationFor(deal, now ?? undefined);
  const alt = findAlternative(canonical, selectedFlightId);
  const breakdown = breakdownFor(deal);
  const score = nitziScore(deal);
  const peers = dealVariantsFor(dest.slug, catalog, 3).filter((d) => d.id !== canonical.id);
  const related = similarDeals(canonical, catalog);
  const scores = scoreBreakdown(deal, peers, selectedFlightId);
  const comparisons = buildComparisons(
    deal,
    [...peers, ...related.map((r) => r.deal)],
  );
  const timing = bookTiming(deal, peers);

  const refresh = async () => {
    setRefreshing(true);
    const res = await revalidateDeal(canonical);
    setRefreshed(res.deal);
    setRevalidation(res);
    setRefreshing(false);
    setNow(Date.now());
    setTimeout(() => setRevalidation(null), 5000);
  };

  const toggleSave = async () => {
    if (!isAuthenticated) {
      setAuthIntent(`/deal/${canonical.id}`);
      setPendingAction("save");
      setSignInOpen(true);
      return;
    }
    try {
      if (savedQ.data) await removeFavorite(canonical.id);
      else await addFavorite(deal);
      qc.invalidateQueries({ queryKey: ["fav", id] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
    } catch (e) {
      console.error(e);
    }
  };

  const goBookingRequest = () =>
    navigate({
      to: "/booking-request/$dealId",
      params: { dealId: canonical.id },
      search: { flight: selectedFlightId },
    });

  const selectFlight = (altId: string) =>
    navigate({
      to: "/deal/$id",
      params: { id: canonical.id },
      search: { flight: altId },
      replace: true,
    });

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-background pb-32 lg:pb-12">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate({ to: "/" })}
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
            aria-label="חזרה לעמוד הבית"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>
          <NitziLogo />
          <div className="flex gap-1">
            <button
              onClick={toggleSave}
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
              aria-label={savedQ.data ? "הסר מהשמורים" : "שמור דיל"}
            >
              <Heart
                className={`h-4 w-4 ${savedQ.data ? "fill-rose-500 text-rose-500" : ""}`}
                aria-hidden
              />
            </button>
            <button
              onClick={() => {
                if (navigator.share)
                  navigator.share({ title: dest.name, url: window.location.href }).catch(() => {});
              }}
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card"
              aria-label="שתף דיל"
            >
              <Share2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 lg:pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <main className="min-w-0 space-y-5">
            <section className="relative overflow-hidden rounded-[2rem] shadow-glow">
              <DestinationImage
                destination={dest}
                className="h-[280px] w-full object-cover sm:h-[420px] lg:h-[480px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {canonical.secret && (
                <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> הדיל הסודי של NITZI
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <p className="text-[11px] font-bold text-white/85">
                  {dest.country} {dest.emoji}
                </p>
                <h1 className="text-2xl font-black leading-tight drop-shadow-md sm:text-4xl">
                  {dest.name}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">{deal.title}</p>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Fact icon={<MapPin className="h-3.5 w-3.5" />} label="מלון" value={deal.hotel.name} />
              <Fact
                icon={<Star className="h-3.5 w-3.5" />}
                label="דירוג"
                value={`${deal.hotel.stars}★ · ${deal.hotel.guestRating.toFixed(1)}/10`}
              />
              <Fact
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="תאריכים"
                value={`${fmtDate(deal.dates.start)} → ${fmtDate(deal.dates.end)}`}
              />
              <Fact
                icon={<Users className="h-3.5 w-3.5" />}
                label="נוסעים ולילות"
                value={`${deal.people} נוסעים · ${deal.dates.nights} לילות`}
              />
              <Fact
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="בסיס אירוח"
                value={boardLabels[deal.board]}
              />
              <Fact
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="ניקוד NITZI"
                value={`${score.value}/100`}
              />
              <Fact
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="מחיר לאדם"
                value={fmtILS(deal.price.perPerson)}
              />
              <Fact
                icon={<Clock className="h-3.5 w-3.5" />}
                label="עודכן"
                value={agoLabel(deal.price.verifiedAt, now)}
              />
            </section>

            <VerificationBadge
              v={v}
              updatedLabel={agoLabel(deal.price.verifiedAt, now)}
              onRefresh={refreshing ? undefined : refresh}
            />
            {revalidation && <RevalidationNote res={revalidation} />}

            <DealExplanation
              deal={deal}
              peers={peers}
              defaultOpen
              title="למה זו הבחירה של NITZI?"
            />

            <Section title="ניקוד NITZI — פירוט מלא" icon={<Sparkles className="h-4 w-4" />}>
              <ScoreBreakdownPanel breakdown={scores} />
            </Section>

            <Section title="השוואה לחלופות" icon={<Scale className="h-4 w-4" />}>
              <DealComparison comparisons={comparisons} />
            </Section>

            <Section title="האם זה זמן טוב להזמין?" icon={<Clock className="h-4 w-4" />}>
              <BookTimingCard timing={timing} />
            </Section>


            <Section title="פרטי הטיסה" icon={<Plane className="h-4 w-4" />}>
              <DealFlightSection
                deal={deal}
                alt={alt}
                verification={v}
                flightsCents={breakdown.flightsCents + breakdown.taxesCents}
              />
            </Section>

            <Section title="אפשרויות טיסה נוספות" icon={<Plane className="h-4 w-4" />}>
              <DealFlightAlternatives
                deal={canonical}
                selectedId={selectedFlightId}
                onSelect={(a) => selectFlight(a.id)}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                בחירת אפשרות אחרת מעדכנת מחיר, כבודה, משך טיסה וניקוד NITZI. הדיל המקורי נשמר ללא
                שינוי, והבחירה תאומת שוב לפני שליחת בקשת ההזמנה.
              </p>
            </Section>

            <Section title="המלון" icon={<MapPin className="h-4 w-4" />}>
              <h3 className="text-lg font-black">{deal.hotel.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span aria-label={`${deal.hotel.stars} כוכבים`} className="inline-flex">
                  {Array.from({ length: deal.hotel.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span>· דירוג אורחים {deal.hotel.guestRating.toFixed(1)}/10</span>
                <span>· {deal.hotel.reviewsCount.toLocaleString("he-IL")} ביקורות</span>
                <span>· {boardLabels[deal.board]}</span>
              </div>
              <p className="mt-2 text-sm">{deal.hotel.note}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                צ׳ק-אין ותנאי חדר מדויקים (סוג חדר, נגישות, מתקנים) מאושרים מול הספק לפני ההזמנה.
                מוצגים כאן רק פרטים הקיימים בנתוני החבילה.
              </p>
            </Section>

            <Section title="האזור בקצרה" icon={<MapPin className="h-4 w-4" />}>
              <DealMap dest={dest} hotelName={deal.hotel.name} />
            </Section>

            <Section title="טיפים ליעד" icon={<MapPin className="h-4 w-4" />}>
              <TravelTips dest={dest} />
            </Section>

            <Section title="מה כלול ומה לא" icon={<ListChecks className="h-4 w-4" />}>
              <DealInclusions items={inclusionsFor(deal, alt)} />
            </Section>

            <Section title="פירוט מחיר" icon={<Wallet className="h-4 w-4" />}>
              <DealPriceBreakdown b={breakdown} />
              <div className="mt-3">
                <SmartPriceBadge deal={deal} full />
              </div>
            </Section>

            <Section title="מדיניות וביטול" icon={<Shield className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm">
                <li>ביטול: {deal.cancellation}</li>
                <li>
                  החזר כספי: החזרים מבוצעים לאמצעי התשלום המקורי לאחר אישור הספק. בהזמנת הדגמה לא
                  מתבצע חיוב ולכן אין החזר.
                </li>
                <li>
                  דרכון ומסמכים: נדרש דרכון בתוקף ל-6 חודשים לפחות מיום היציאה. דרישות ויזה נקבעות
                  על ידי רשויות היעד — יש לבדוק לפני הנסיעה.
                </li>
              </ul>
            </Section>

            <Section title="המסלול היומי שלכם" icon={<Calendar className="h-4 w-4" />}>
              <ConciergeItinerary deal={deal} />
            </Section>

            <Section title="הערכת עלות החופשה כולה" icon={<Wallet className="h-4 w-4" />}>
              <ConciergeCost deal={deal} />
            </Section>

            <Section title="למי החופשה הזו מתאימה?" icon={<Users className="h-4 w-4" />}>
              <ConciergeAudience deal={deal} />
            </Section>

            <Section title="מזג אוויר ועונתיות" icon={<ThermometerSun className="h-4 w-4" />}>
              <ConciergeWeather deal={deal} />
            </Section>

            <Section title="פרופיל החוויה" icon={<Sparkles className="h-4 w-4" />}>
              <ConciergeExperience deal={deal} />
            </Section>

            <Section title="איך אפשר לחסוך" icon={<PiggyBank className="h-4 w-4" />}>
              <ConciergeSavings deal={deal} peers={peers} />
            </Section>

            <Section title="יעדים דומים" icon={<MapPin className="h-4 w-4" />}>
              <ConciergeAlternatives deal={deal} catalog={catalog} />
            </Section>

            <Section title="שאלות נפוצות" icon={<ListChecks className="h-4 w-4" />}>
              <FAQ deal={deal} verificationLabel={v.label} />
            </Section>

            <section>
              <h2 className="mb-3 text-lg font-black">חבילות דומות</h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {related.map(({ deal: d, reason }) => (
                  <li key={d.id}>
                    <Link
                      to="/deal/$id"
                      params={{ id: d.id }}
                      className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/50"
                    >
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">
                        {SIMILAR_LABEL[reason]}
                      </span>
                      <p className="mt-2 text-sm font-black">{d.destination.name}</p>
                      <p className="text-[12px] text-muted-foreground">{d.hotel.name}</p>
                      <p className="mt-1 text-sm font-black">
                        {fmtILS(d.price.perPerson)} <span className="text-[11px]">לאדם</span>
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <ConciergeClosing deal={deal} peers={peers} />
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                <VerificationBadge v={v} compact />
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    מחיר לאדם
                  </div>
                  <div className="text-4xl font-black">{fmtILS(deal.price.perPerson)}</div>
                  <div className="text-xs text-muted-foreground">
                    סה״כ {fmtILS(deal.price.total)} · {deal.people} נוסעים
                  </div>
                </div>
                <div className="mt-3">
                  <SmartPriceBadge deal={deal} full />
                </div>
                <button
                  onClick={goBookingRequest}
                  disabled={!v.bookable}
                  className="mt-4 w-full rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
                >
                  {v.bookable ? "המשך לבקשת הזמנה" : "החבילה אינה זמינה כרגע"}
                </button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  המחיר והזמינות יאומתו מול ספק צד ג׳ לפני אישור סופי. לא יתבצע חיוב בשלב זה.
                </p>
                <div className="mt-3">
                  <PriceAlertButton deal={deal} />
                </div>
                <Link
                  to="/destination/$slug"
                  params={{ slug: dest.slug }}
                  className="mt-2 block rounded-2xl border border-border px-4 py-3 text-center text-sm font-black hover:border-primary/50"
                >
                  מדריך היעד: {dest.name}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-glow backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {v.label}
            </div>
            <div className="text-xl font-black">{fmtILS(deal.price.perPerson)}</div>
            <div className="text-[10px] text-muted-foreground">
              סה״כ {fmtILS(deal.price.total)} ל-{deal.people} נוסעים
            </div>
          </div>
          <button
            onClick={goBookingRequest}
            disabled={!v.bookable}
            className="shrink-0 rounded-2xl bg-gradient-sunset px-5 py-3 text-sm font-black text-white shadow-glow disabled:opacity-50"
          >
            {v.bookable ? "בקשת הזמנה" : "לא זמין"}
          </button>
        </div>
      </div>

      <SignInModal
        open={signInOpen}
        onClose={(signed) => {
          setSignInOpen(false);
          if (!signed) {
            setPendingAction(null);
            return;
          }
          if (pendingAction === "save") toggleSave();
          if (pendingAction === "book") goBookingRequest();
          setPendingAction(null);
        }}
        reason={
          pendingAction === "save"
            ? "כדי לשמור לרשימה שלך צריך חשבון NITZI."
            : "כדי להתקדם לבקשת הזמנה צריך חשבון NITZI."
        }
      />
    </div>
  );
}

function RevalidationNote({ res }: { res: RevalidationResult }) {
  if (res.status === "verified")
    return (
      <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-900">
        הבדיקה הושלמה — המחיר שהוצג עדיין תקף.
      </p>
    );
  if (res.status === "changed")
    return (
      <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900">
        הספק עדכן מחיר: {fmtILS(res.oldPrice)} → {fmtILS(res.newPrice)}. לא יתבצע חיוב ללא אישורך.
      </p>
    );
  return (
    <p className="rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-900">
      החבילה אינה זמינה כרגע. אפשר לבחור תאריכים אחרים או חבילה דומה.
    </p>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-sunset text-white">
          {icon}
        </span>
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-[12px] font-black">{value}</div>
    </div>
  );
}

function FAQ({ deal, verificationLabel }: { deal: Deal; verificationLabel: string }) {
  const items = [
    {
      q: "האם המחיר סופי?",
      a: `סטטוס הנתונים כרגע: ${verificationLabel}. המחיר והזמינות מאומתים מול הספק לפני אישור סופי, וכל שינוי מוצג לפני חיוב.`,
    },
    {
      q: "האם ניתן לשנות את הטיסה?",
      a: "כן. בסעיף אפשרויות טיסה נוספות ניתן לבחור אפשרות אחרת; המחיר, הכבודה והניקוד מתעדכנים מיד.",
    },
    {
      q: "מה כלול במחיר?",
      a: "פירוט מלא מופיע בסעיף \"מה כלול ומה לא\", כולל פריטים אופציונליים ופריטים הטעונים אישור.",
    },
    {
      q: "מה מדיניות הביטול?",
      a: deal.cancellation,
    },
    {
      q: "האם נדרש דרכון בתוקף?",
      a: "כן — דרכון בתוקף ל-6 חודשים לפחות מיום היציאה, ובדיקת דרישות ויזה מול רשויות היעד.",
    },
  ];
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.q} className="rounded-2xl border border-border bg-background/60">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 p-3 text-[13px] font-black">
              {i.q}
              <ChevronDown
                className="ms-auto h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="px-3 pb-3 text-[12px] leading-relaxed text-muted-foreground">{i.a}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
