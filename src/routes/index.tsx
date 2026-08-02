import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero-main.jpg";
import { NitziLogo } from "@/components/NitziLogo";
import { SearchEngine } from "@/components/SearchEngine";
import { DestinationCarousel } from "@/components/DestinationCarousel";
import { DealRails } from "@/components/DealRails";
import { SecretDealCard } from "@/components/SecretDealCard";
import { SignInModal } from "@/components/SignInModal";
import { Footer } from "@/components/Footer";
import { DemoDataNotice } from "@/components/DemoDataNotice";
import { categories } from "@/lib/nitzi-data";
import { displayNameOf, useAuth } from "@/lib/auth";
import { LogIn, Sparkles, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NITZI — עוזר ה-AI שמתכנן לך את החופשה המושלמת" },
      { name: "description", content: "חפש חופשה או תן ל-NITZI לבחור בשבילך. יעדים, מלונות, מסלולים ואטרקציות בהתאמה אישית." },
      { property: "og:title", content: "NITZI — החופשה הבאה שלך מתחילה כאן" },
      { property: "og:description", content: "חיפוש חופשות חכם + עוזר AI אישי שיודע מה מתאים בדיוק לך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700;800&family=Heebo:wght@700;800;900&display=swap" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

          <div className="absolute inset-x-0 top-0 z-10">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-6 sm:px-8">
              <NitziLogo />
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> AI פעיל
                </div>
                {user ? (
                  <Link
                    to="/account"
                    className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md"
                    aria-label="החשבון שלי"
                  >
                    <UserIcon className="h-3.5 w-3.5" /> {displayNameOf(user)}
                  </Link>
                ) : (
                  <button
                    onClick={() => setSignInOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-foreground shadow-glow"
                  >
                    <LogIn className="h-3.5 w-3.5" /> התחבר
                  </button>
                )}
              </div>
            </div>
          </div>

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
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> מחיר נבדק ואומת</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> מסלולים בהתאמה אישית</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> חופשה מלאה במקום אחד</span>
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
      </div>

      <div className="mx-auto mt-14 flex w-full max-w-[1600px] flex-col gap-10 px-5 sm:px-8">
        {categories.map((c) => (
          <DestinationCarousel key={c.id} category={c} asDeals={c.id === "lastminute" || c.id === "ai"} />
        ))}
      </div>


      <Footer />

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} onSignedIn={() => navigate({ to: "/account" })} />
    </div>
  );
}
