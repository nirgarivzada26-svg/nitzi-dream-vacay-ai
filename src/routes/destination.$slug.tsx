// Destination page — everything NITZI actually knows about a place, straight
// from the managed catalog (`public.destinations`). Sections without verified
// data are labelled "currently unavailable" rather than filled with invention.

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  Coins,
  Compass,
  MapPin,
  Plane,
  Sun,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { DestinationImage } from "@/components/DestinationImage";
import { DealCard } from "@/components/DealCard";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { findDestination } from "@/lib/catalog";
import { getDeal } from "@/lib/deals";
import { DestinationPageSkeleton } from "@/components/DestinationPageSkeleton";
import { canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/destination/$slug")({
  loader: async ({ context, params }) => {
    const catalog = await context.queryClient.ensureQueryData(destinationsQueryOptions);
    // Resolved here so an unknown slug is a normal render (empty state), not a
    // thrown error during render.
    return { known: !!findDestination(catalog, decodeURIComponent(params.slug)) };
  },
  pendingComponent: DestinationPageSkeleton,
  head: ({ params }) => {
    const name = decodeURIComponent(params.slug);
    return {
      meta: [
        { title: `${name} — מדריך יעד, מחירים וחבילות | NITZI` },
        {
          name: "description",
          content: `כל מה שצריך לדעת על ${name}: עונות, מזג אוויר, תקציב ממוצע, אטרקציות, מסעדות וחבילות נופש מאומתות ב-NITZI.`,
        },
        { property: "og:title", content: `${name} — מדריך יעד | NITZI` },
        {
          property: "og:description",
          content: `עונות, תקציב, אטרקציות וחבילות מאומתות ל${name}.`,
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [canonicalLink(`/destination/${encodeURIComponent(params.slug)}`)],
    };
  },
  errorComponent: ({ reset }) => (
    <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-black">לא הצלחנו לטעון את היעד</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          ייתכן שהייתה בעיית תקשורת. אפשר לנסות שוב.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-foreground"
          >
            נסה שוב
          </button>
          <Link
            to="/"
            className="inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white"
          >
            חזרה לבית
          </Link>
        </div>
      </div>
    </div>
  ),
  notFoundComponent: () => <UnknownDestination />,
  component: DestinationPage,
});

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

const MONTHS_HE = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const CATEGORY_HE: Record<string, string> = {
  beach: "חופים",
  city: "עיר",
  island: "אי",
  romantic: "רומנטי",
  family: "משפחות",
  friends: "חברים",
  nightlife: "חיי לילה",
  nature: "טבע",
  adventure: "הרפתקאות",
};

/** Facts we can state because they come from the catalog row. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sun;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <span className="flex items-center gap-1.5 text-[11px] font-black text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <div className="mt-1 text-lg font-black">
        {value ?? <span className="text-sm text-muted-foreground">לא זמין כרגע</span>}
      </div>
    </div>
  );
}

function ListSection({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Sun;
  items: string[];
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {items.length ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((t) => (
            <li
              key={t}
              className="rounded-2xl bg-muted/60 px-4 py-3 text-sm font-bold text-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function UnknownDestination() {
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-black">היעד לא נמצא במאגר</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          אנחנו מציגים רק יעדים עם נתונים מאומתים.
        </p>
        <Link
          to="/packages"
          className="mt-4 inline-block rounded-2xl bg-gradient-sunset px-4 py-2 text-sm font-black text-white"
        >
          לכל היעדים
        </Link>
      </div>
    </div>
  );
}

function DestinationPage() {
  const { slug } = Route.useParams();
  const catalog = useDestinations();
  const dest = findDestination(catalog, decodeURIComponent(slug));
  if (!dest) return <UnknownDestination />;

  const deal = dest.hasOffers ? getDeal(dest.slug, catalog) : null;
  const nearby = catalog
    .filter((d) => d.slug !== dest.slug && d.region === dest.region)
    .slice(0, 6);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <TopNav variant="overlay" />

      <header className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
        <DestinationImage destination={dest} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1600px] px-5 pb-8 sm:px-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            {dest.emoji} {dest.country} · {dest.region}
          </span>
          <h1 className="mt-3 text-4xl font-black text-white drop-shadow sm:text-6xl">
            {dest.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-bold text-white/90 sm:text-lg">
            {dest.tagline}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 sm:px-10">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Sun} label="מזג אוויר ועונה" value={dest.weather || null} />
          <Fact
            icon={Clock}
            label="זמן טיסה מישראל"
            value={dest.flightHours ? `${dest.flightHours} שעות` : null}
          />
          <Fact
            icon={Wallet}
            label="תקציב ממוצע לאדם"
            value={dest.avgBudgetPerPerson ? fmtILS(dest.avgBudgetPerPerson) : null}
          />
          <Fact
            icon={Compass}
            label="מתאים במיוחד ל"
            value={dest.matches.length ? `${dest.matches.length} סגנונות חופשה` : null}
          />
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            icon={Plane}
            label="שדות תעופה"
            value={dest.airportCodes.length ? dest.airportCodes.join(" · ") : null}
          />
          <Fact icon={Coins} label="מטבע מקומי" value={dest.currency || null} />
          <Fact
            icon={Compass}
            label="שפות"
            value={dest.languages.length ? dest.languages.join(", ") : null}
          />
          <Fact
            icon={CalendarDays}
            label="חודשים מומלצים"
            value={
              dest.bestTravelMonths.length
                ? dest.bestTravelMonths.map((m) => MONTHS_HE[m - 1] ?? m).join(", ")
                : null
            }
          />
        </section>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black text-muted-foreground">
            {dest.cityEn}, {dest.countryEn} · {dest.subregion || dest.region}
          </span>
          {dest.directFlightFromTLV ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-800">
              <Plane className="h-3.5 w-3.5" /> קיימת טיסה ישירה מתל אביב
            </span>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black text-muted-foreground">
              ללא טיסה ישירה מתל אביב
            </span>
          )}
          {dest.averageTripDuration && (
            <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black text-muted-foreground">
              משך חופשה טיפוסי: {dest.averageTripDuration} ימים
            </span>
          )}
          {dest.timezone && (
            <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-black text-muted-foreground">
              אזור זמן: {dest.timezone}
            </span>
          )}
          {dest.travelCategories.map((c) => (
            <span
              key={c}
              className="rounded-full border border-border px-3 py-1.5 text-[11px] font-black text-muted-foreground"
            >
              {CATEGORY_HE[c] ?? c}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <MapPin className="h-4 w-4 text-primary" /> סקירה
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">
                {dest.name} נמצאת ב{dest.country} ({dest.region}). {dest.tagline} מזג האוויר
                האופייני: {dest.weather || "לא זמין"}. טיסה ישירה מישראל אורכת כ-{dest.flightHours}{" "}
                שעות, והתקציב הממוצע לאדם לחופשה ביעד עומד על {fmtILS(dest.avgBudgetPerPerson)}.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800">
                <BadgeCheck className="h-3.5 w-3.5" /> נתוני היעד מגיעים ממאגר היעדים המנוהל של
                NITZI
              </p>
            </section>

            <ListSection
              title="אטרקציות מובילות"
              icon={Compass}
              items={dest.attractions}
              empty="עדיין לא נאספו אטרקציות מאומתות ליעד הזה."
            />
            <ListSection
              title="מסעדות מומלצות"
              icon={UtensilsCrossed}
              items={dest.restaurants}
              empty="עדיין לא נאספו המלצות קולינריות מאומתות ליעד הזה."
            />
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="h-4 w-4 text-primary" /> מסלול יומי מוצע
              </h2>
              {dest.itinerary.length ? (
                <ol className="mt-3 grid gap-2">
                  {dest.itinerary.map((day, i) => (
                    <li key={day} className="flex gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold">{day}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm font-semibold text-muted-foreground">
                  אין עדיין מסלול מאומת ליעד הזה.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-black">מלונות במאגר</h2>
              {dest.hotels.length ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {dest.hotels.map((h) => (
                    <li key={h.name} className="rounded-2xl border border-border/70 px-4 py-3">
                      <div className="text-sm font-black">{h.name}</div>
                      {h.note && (
                        <div className="text-xs font-semibold text-muted-foreground">{h.note}</div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm font-semibold text-muted-foreground">
                  אין כרגע מלונות מאומתים ליעד הזה.
                </p>
              )}
            </section>
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Coins className="h-4 w-4 text-primary" /> חבילה זמינה
              </h2>
              {deal ? (
                <div className="mt-3">
                  <DealCard deal={deal} fluid />
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-muted-foreground">
                  אין כרגע חבילה זמינה ליעד הזה. אפשר לחפש טיסות בלבד או לבדוק יעדים סמוכים.
                </p>
              )}
              <div className="mt-4 grid gap-2">
                <Link
                  to="/flights"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:border-primary/50"
                >
                  <Plane className="h-4 w-4" /> טיסות ל{dest.name}
                </Link>
                <Link
                  to="/packages"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-black hover:border-primary/50"
                >
                  כל החבילות
                </Link>
              </div>
            </section>

            {dest.latitude !== null && dest.longitude !== null && (
              <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
                <h2 className="flex items-center gap-2 p-5 pb-3 text-lg font-black">
                  <MapPin className="h-4 w-4 text-primary" /> מפה
                </h2>
                <iframe
                  title={`מפה של ${dest.name}`}
                  loading="lazy"
                  className="h-64 w-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${dest.longitude - 0.15}%2C${dest.latitude - 0.12}%2C${dest.longitude + 0.15}%2C${dest.latitude + 0.12}&layer=mapnik&marker=${dest.latitude}%2C${dest.longitude}`}
                />
                <p className="px-5 py-3 text-[11px] font-bold text-muted-foreground">
                  {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)} · OpenStreetMap
                </p>
              </section>
            )}

            {nearby.length > 0 && (
              <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
                <h2 className="text-lg font-black">יעדים נוספים ב{dest.region}</h2>
                <ul className="mt-3 grid gap-2">
                  {nearby.map((d) => (
                    <li key={d.slug}>
                      <Link
                        to="/destination/$slug"
                        params={{ slug: d.slug }}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 px-4 py-3 text-sm font-black hover:border-primary/50"
                      >
                        <span>
                          {d.emoji} {d.name}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {fmtILS(d.avgBudgetPerPerson)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
