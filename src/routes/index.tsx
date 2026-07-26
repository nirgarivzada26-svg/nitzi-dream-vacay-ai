import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero-main.jpg";
import { NitziLogo } from "@/components/NitziLogo";
import { SearchEngine } from "@/components/SearchEngine";
import { DestinationCarousel } from "@/components/DestinationCarousel";
import { categories } from "@/lib/nitzi-data";
import { Sparkles } from "lucide-react";

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
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16">
      {/* HERO */}
      <section className="relative">
        <div className="relative h-[560px] w-full overflow-hidden">
          <img
            src={heroImg}
            alt="חוף טורקיז מלמעלה"
            width={1600}
            height={1200}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-10">
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-6">
              <NitziLogo />
              <div className="flex items-center gap-1 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> AI פעיל
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="absolute inset-x-0 bottom-40 mx-auto max-w-md px-5 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> NITZI · Travel AI
            </span>
            <h1 className="mt-3 text-4xl font-black leading-tight drop-shadow-lg">
              לאן בא לך <span className="text-gradient-sunset">לברוח</span>
              <br />הפעם?
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/90">
              חפש בעצמך או תן ל-NITZI לבנות לך את החופשה המושלמת ב־60 שניות.
            </p>
          </div>
        </div>

        {/* Search engine floating */}
        <div className="relative z-20 -mt-32 px-4">
          <div className="mx-auto max-w-md animate-fade-up">
            <SearchEngine />
          </div>
        </div>
      </section>

      {/* Categories */}
      <div className="mx-auto mt-10 flex max-w-md flex-col gap-10 px-5">
        {categories.map((c) => (
          <DestinationCarousel key={c.id} category={c} />
        ))}
      </div>

      <footer className="mx-auto mt-14 max-w-md px-5 text-center text-[11px] text-muted-foreground">
        NITZI · העוזר האישי לחופשות · MVP
      </footer>
    </div>
  );
}
