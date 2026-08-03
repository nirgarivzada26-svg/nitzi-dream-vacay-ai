import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero-main.jpg";
import { TopNav } from "@/components/TopNav";
import { SearchEngine } from "@/components/SearchEngine";
import { DealRails } from "@/components/DealRails";
import { SecretDealCard } from "@/components/SecretDealCard";
import { SignInModal } from "@/components/SignInModal";
import { Footer } from "@/components/Footer";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { destinationsQueryOptions, useDestinations } from "@/lib/use-catalog";
import { DestinationImage } from "@/components/DestinationImage";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NITZI — עוזר ה-AI שמתכנן לך את החופשה המושלמת" },
      {
        name: "description",
        content:
          "חפש חופשה או תן ל-NITZI לבחור בשבילך. יעדים, מלונות, מסלולים ואטרקציות בהתאמה אישית.",
      },
      { property: "og:title", content: "NITZI — החופשה הבאה שלך מתחילה כאן" },
      {
        property: "og:description",
        content: "חיפוש חופשות חכם + עוזר AI אישי שיודע מה מתאים בדיוק לך.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Heebo:wght@700;800;900&display=swap",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQueryOptions),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16">
      <section className="relative">
        <div className="relative w-full overflow-hidden">
          <img
            src={heroImg}
            alt="חוף טורקיז מלמעלה"
            width={2400}
            height={1400}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <TopNav variant="overlay" />

          <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-5 pt-28 pb-16 text-center text-white sm:px-8 sm:pt-32 lg:pt-36">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> NITZI · Travel AI
            </span>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] drop-shadow-lg sm:text-6xl lg:text-8xl">
              לאן בא לך <span className="text-gradient-sunset">לברוח</span>
              <br className="sm:hidden" /> הפעם?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-xl">
              החיים קצרים. תצא לחוות. חפש בעצמך או תן ל-NITZI לבנות לך את החופשה המושלמת ב־60 שניות.
            </p>

            <div className="mt-10 w-full max-w-6xl animate-fade-up">
              <SearchEngine size="lg" />
            </div>

            <div className="mt-6 hidden items-center gap-6 text-[11px] font-bold text-white/90 sm:flex">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> מחיר נבדק ואומת
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> מסלולים בהתאמה אישית
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> חופשה מלאה במקום אחד
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 w-full max-w-[1600px] px-5 sm:mt-12 sm:px-8">
        <DemoDataNotice />
      </div>

      <div className="mx-auto mt-6 w-full max-w-[1600px]">
        <SecretDealCard />
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1600px] px-5 sm:mt-16 sm:px-8">
        <DealRails />

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-sunset px-10 py-5 text-lg font-black text-white shadow-glow transition hover:scale-[1.02] active:scale-95 sm:text-xl"
            >
              <Sparkles className="h-5 w-5" /> לכל החבילות
            </Link>
            <Link
              to="/flights"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-10 py-5 text-lg font-black text-foreground shadow-soft transition hover:border-primary hover:text-primary active:scale-95 sm:text-xl"
            >
              לכל הטיסות
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            כל קטלוג החבילות של NITZI — עם סינון לפי מחיר, מדינה, כוכבים והכל כלול.
          </p>
        </div>
      </div>

      <WhyNitzi />

      <PopularDestinations />


      <Footer />

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => navigate({ to: "/account" })}
      />
    </div>
  );
}

/** Browse the managed catalog — every card links into a real search. */
function PopularDestinations() {
  const catalog = useDestinations();
  const popular = catalog.filter((d) => d.isPopular).slice(0, 12);
  if (popular.length === 0) return null;

  return (
    <section className="mx-auto mt-14 w-full max-w-[1600px] px-5 sm:mt-20 sm:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground sm:text-3xl">יעדים פופולריים</h2>
          <p className="mt-1 text-sm text-muted-foreground">הכי מבוקשים כרגע מתל אביב</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {popular.map((d) => (
          <Link
            key={d.slug}
            to="/result"
            search={{ destination: d.slug }}
            className="group relative h-44 overflow-hidden rounded-3xl border border-border/60 shadow-soft transition hover:shadow-glow sm:h-52"
          >
            <DestinationImage
              destination={d}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="text-[11px] font-bold text-white/85">
                {d.country} {d.emoji}
              </p>
              <p className="text-lg font-black leading-tight">{d.name}</p>
              <p className="mt-0.5 text-[11px] text-white/80">
                {d.hasOffers
                  ? `מ־₪${d.avgBudgetPerPerson.toLocaleString()} לאדם`
                  : "אין דילים כרגע"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
