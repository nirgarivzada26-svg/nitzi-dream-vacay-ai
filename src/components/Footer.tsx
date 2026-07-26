import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Twitter, Youtube, Mail, Shield, Sparkles } from "lucide-react";
import { NitziLogo } from "@/components/NitziLogo";

const columns = [
  {
    title: "NITZI",
    links: [
      { label: "אודות NITZI", href: "#about" },
      { label: "החזון שלנו", href: "#vision" },
      { label: "בלוג טיולים", href: "#blog" },
      { label: "עיתונות", href: "#press" },
      { label: "קריירה", href: "#careers" },
    ],
  },
  {
    title: "עזרה ושירות",
    links: [
      { label: "מרכז העזרה", href: "#help" },
      { label: "שאלות נפוצות", href: "#faq" },
      { label: "צור קשר", href: "#contact" },
      { label: "מדיניות ביטולים", href: "#cancel" },
      { label: "סטטוס מערכת", href: "#status" },
    ],
  },
  {
    title: "מידע משפטי",
    links: [
      { label: "תנאי שימוש", href: "#terms" },
      { label: "מדיניות פרטיות", href: "#privacy" },
      { label: "תקנון האתר", href: "#tos" },
      { label: "מדיניות עוגיות", href: "#cookies" },
      { label: "הצהרת נגישות", href: "#a11y" },
    ],
  },
];

export function Footer() {
  return (
    <footer dir="rtl" className="relative mt-20 overflow-hidden border-t border-border/60 bg-gradient-to-b from-background to-muted/40">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -top-32 right-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 pt-14 pb-8 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <NitziLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              NITZI הוא עוזר AI אישי שמציג רק הצעות אמינות, מעודכנות ואיכותיות — ומאפשר לך למצוא ולהזמין את החופשה הבאה בביטחון מלא.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[
                { Icon: Instagram, label: "Instagram" },
                { Icon: Facebook, label: "Facebook" },
                { Icon: Twitter, label: "X / Twitter" },
                { Icon: Youtube, label: "YouTube" },
                { Icon: Mail, label: "Email" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <Shield className="h-3.5 w-3.5" /> תשלום מאובטח · מחיר מאומת · ללא עמלות סמויות
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-black text-foreground">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground transition hover:text-primary">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-sunset text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-foreground">קבל דילים סודיים לפני כולם</p>
                <p className="text-xs text-muted-foreground">התראות רק על דילים מאומתים — בלי ספאם, אפשר לבטל בכל רגע.</p>
              </div>
            </div>
            <form className="flex w-full max-w-sm items-center gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground outline-none focus:border-primary"
              />
              <button className="rounded-full bg-gradient-sunset px-4 py-2.5 text-sm font-black text-white shadow-glow transition active:scale-95">
                הרשמה
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-center text-[11px] text-muted-foreground sm:flex-row sm:text-right">
          <p>© {new Date().getFullYear()} NITZI Travel AI · כל הזכויות שמורות</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/" className="transition hover:text-primary">עמוד הבית</Link>
            <a href="#privacy" className="transition hover:text-primary">פרטיות</a>
            <a href="#terms" className="transition hover:text-primary">תנאים</a>
            <a href="#cookies" className="transition hover:text-primary">עוגיות</a>
            <a href="#a11y" className="transition hover:text-primary">נגישות</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
