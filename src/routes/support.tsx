// Support center — FAQ, self-service links and a real support request form
// that writes to the database (visible to staff in the admin area).

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Send,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { SignInModal } from "@/components/SignInModal";
import { useAuth } from "@/lib/auth";
import {
  SUPPORT_FAQ,
  SUPPORT_TOPICS,
  createSupportRequest,
  listSupportRequests,
  topicLabel,
  type SupportRequestRow,
  type SupportTopic,
} from "@/lib/support";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "מרכז התמיכה של NITZI — עזרה, ביטולים והחזרים" },
      {
        name: "description",
        content:
          "שאלות נפוצות, ניהול הזמנה, ביטול והחזר כספי, ופתיחת פנייה לצוות NITZI. מענה אנושי לכל שלב בחופשה.",
      },
      { property: "og:title", content: "מרכז התמיכה של NITZI" },
      {
        property: "og:description",
        content: "עזרה מהירה: ביטולים, החזרים, מסמכי נסיעה ופנייה לצוות.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportPage,
});

const CHANNELS = [
  {
    icon: MessageCircle,
    title: "צ׳אט חי",
    detail: "זמין בדמו — פנייה בטופס נענית באותו ערוץ",
    action: null,
  },
  {
    icon: Phone,
    title: "WhatsApp",
    detail: "מענה בימים א׳–ה׳, 09:00–18:00",
    action: null,
  },
  {
    icon: Mail,
    title: "אימייל",
    detail: "support@nitzi.travel",
    action: "mailto:support@nitzi.travel",
  },
] as const;

function SupportPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState<SupportTopic>("booking");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SupportRequestRow | null>(null);
  const [mine, setMine] = useState<SupportRequestRow[]>([]);
  const [signIn, setSignIn] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!user) {
      setMine([]);
      return;
    }
    setEmail((e) => e || user.email || "");
    listSupportRequests()
      .then(setMine)
      .catch(() => setMine([]));
  }, [user]);

  const submit = async () => {
    if (!user) {
      setSignIn(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await createSupportRequest({ topic, email, message });
      setSent(row);
      setMessage("");
      setMine((prev) => [row, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שליחת הפנייה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <TopNav />

      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 sm:px-10">
        <header className="rounded-[2rem] bg-gradient-to-l from-primary/15 via-accent/10 to-transparent p-7 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-black text-primary shadow-soft">
            <LifeBuoy className="h-3.5 w-3.5" /> מרכז התמיכה
          </span>
          <h1 className="mt-4 text-3xl font-black sm:text-5xl">איך אפשר לעזור?</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-muted-foreground sm:text-base">
            ביטולים, החזרים, מסמכי נסיעה ושינויים בהזמנה — הכול במקום אחד, עם מענה אנושי כשצריך.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {CHANNELS.map(({ icon: Icon, title, detail, action }) => {
            const inner = (
              <>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-black">{title}</div>
                  <div className="text-xs font-semibold text-muted-foreground">{detail}</div>
                </div>
              </>
            );
            return action ? (
              <a
                key={title}
                href={action}
                className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/40"
              >
                {inner}
              </a>
            ) : (
              <div
                key={title}
                className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft"
              >
                {inner}
              </div>
            );
          })}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <section>
            <h2 className="text-xl font-black">שאלות נפוצות</h2>
            <div className="mt-3 grid gap-2">
              {SUPPORT_FAQ.map((item, i) => (
                <div key={item.q} className="rounded-3xl border border-border bg-card shadow-soft">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right text-sm font-black"
                  >
                    {item.q}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <p className="px-5 pb-4 text-sm font-semibold leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h3 className="text-sm font-black">פעולות מהירות</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/account"
                  search={{ tab: "bookings" }}
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-black hover:border-primary/50"
                >
                  ניהול הזמנה
                </Link>
                <Link
                  to="/account"
                  search={{ tab: "favorites" }}
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-black hover:border-primary/50"
                >
                  המועדפים שלי
                </Link>
                <Link
                  to="/packages"
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-black hover:border-primary/50"
                >
                  כל החבילות
                </Link>
                <Link
                  to="/ai"
                  className="rounded-2xl border border-border px-4 py-2 text-xs font-black hover:border-primary/50"
                >
                  שאל את NITZI AI
                </Link>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black">פתיחת פנייה</h2>
            <div className="mt-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
              {sent && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs font-bold">
                    הפנייה נקלטה (#{sent.id.slice(0, 8).toUpperCase()}). נחזור אליך לכתובת{" "}
                    {sent.email}.
                  </p>
                </div>
              )}

              <label className="block text-xs font-black text-muted-foreground">נושא</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as SupportTopic)}
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold"
              >
                {SUPPORT_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label className="mt-4 block text-xs font-black text-muted-foreground">אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold"
              />

              <label className="mt-4 block text-xs font-black text-muted-foreground">
                איך נוכל לעזור?
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="פרטו את הבקשה, ואם רלוונטי — מספר ההזמנה"
                className="mt-1 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold"
              />

              {error && <p className="mt-2 text-xs font-black text-destructive">{error}</p>}

              <button
                onClick={submit}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset px-4 py-3 text-sm font-black text-white shadow-glow disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {busy ? "שולח…" : user ? "שליחת פנייה" : "התחבר ושלח"}
              </button>
              {!user && (
                <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
                  הפניות נשמרות בחשבון שלך כדי שתוכל לעקוב אחריהן.
                </p>
              )}
            </div>

            {mine.length > 0 && (
              <div className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
                <h3 className="flex items-center gap-2 text-sm font-black">
                  <Ticket className="h-4 w-4" /> הפניות שלי
                </h3>
                <ul className="mt-3 grid gap-2">
                  {mine.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black">{topicLabel(r.topic)}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black">
                          {r.status === "open" ? "פתוחה" : r.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">
                        {r.message}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-muted-foreground">
                        #{r.id.slice(0, 8).toUpperCase()} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("he-IL")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
      <SignInModal
        open={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={() => setSignIn(false)}
      />
    </div>
  );
}
