import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-beach.jpg";
import { NitziLogo } from "@/components/NitziLogo";
import { Sparkles, Compass, Wand2, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NITZI — עוזר ה-AI האישי לתכנון החופשה המושלמת" },
      { name: "description", content: "NITZI מבין אותך ובונה לך חופשה מותאמת אישית — יעד, מסלול, מלונות ואטרקציות ברגע." },
      { property: "og:title", content: "NITZI — תכנן לי חופשה" },
      { property: "og:description", content: "עוזר AI חכם שבונה לך את החופשה המושלמת בהתאמה אישית." },
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
    <div dir="rtl" className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gradient-sunset opacity-40 blur-3xl animate-blob" />
      <div aria-hidden className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-gradient-ocean opacity-35 blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-6 pb-24">
        {/* Header */}
        <header className="flex items-center justify-between">
          <NitziLogo />
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI פעיל
          </div>
        </header>

        {/* Hero card */}
        <section className="mt-8 animate-fade-up">
          <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
            <img
              src={heroImg}
              alt="חוף טרופי בשקיעה"
              width={1536}
              height={1920}
              className="h-[440px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex justify-between p-5 text-white/90">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> חדש · GPT-Powered
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                <Heart className="h-3.5 w-3.5 fill-current" /> +12K חופשות
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">שלום נוסע/ת</p>
              <h1 className="mt-2 text-4xl font-black leading-tight">
                לאן <span className="text-gradient-sunset">תזרום/י</span>
                <br />הפעם?
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
                NITZI מקשיב לך, מבין את הסגנון שלך ובונה חופשה שהיא רק שלך.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <Link
            to="/quiz"
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-sunset px-6 py-5 text-lg font-black text-white shadow-glow animate-pulse-glow transition-transform active:scale-[0.98]"
          >
            <Wand2 className="h-5 w-5" />
            תכנן לי חופשה
            <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </Link>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            60 שניות · שאלון קצר · תוצאה בהתאמה אישית
          </p>
        </div>

        {/* Feature strip */}
        <section className="mt-8 grid grid-cols-3 gap-3 animate-fade-up" style={{ animationDelay: "220ms" }}>
          {[
            { icon: Compass, label: "יעד חכם", sub: "AI מתאים" },
            { icon: Wand2, label: "מסלול יומי", sub: "מוכן לצאת" },
            { icon: Sparkles, label: "המלצות", sub: "שף · מלון · חוף" },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-card/70 p-3 text-center backdrop-blur">
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-gradient-aurora text-white">
                <f.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-xs font-bold text-foreground">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.sub}</p>
            </div>
          ))}
        </section>

        {/* Vibes chips */}
        <section className="mt-8 animate-fade-up" style={{ animationDelay: "320ms" }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">טרנדים עכשיו</p>
          <div className="flex flex-wrap gap-2">
            {["🏖️ איי יוון", "🌋 באלי", "❄️ לפלנד", "🗼 טוקיו", "🌊 מלדיביים", "🍝 איטליה"].map((c) => (
              <span key={c} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                {c}
              </span>
            ))}
          </div>
        </section>

        <footer className="mt-auto pt-10 text-center text-[11px] text-muted-foreground">
          NITZI · העוזר האישי לחופשות · MVP
        </footer>
      </div>
    </div>
  );
}
