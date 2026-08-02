import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Sparkles, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { NitziLogo } from "@/components/NitziLogo";
import { consumeAuthIntent, setAuthIntent, useAuth } from "@/lib/auth";
import { updateNotifPrefs } from "@/lib/user-data";
import { z } from "zod";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "התחברות — NITZI" },
      {
        name: "description",
        content: "התחבר או הירשם ל-NITZI כדי לשמור דילים, לצפות בהזמנות ולקבל המלצות בהתאמה אישית.",
      },
      { property: "og:title", content: "התחברות ל-NITZI" },
      { property: "og:description", content: "חשבון NITZI לחופשה שלך." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [notifyDeals, setNotifyDeals] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preserve intended destination for callbacks that navigate away.
  useEffect(() => {
    if (redirect) setAuthIntent(redirect);
  }, [redirect]);

  // If we became authenticated (after magic link redirect back), go home / intent.
  useEffect(() => {
    if (!loading && user) {
      const dest = consumeAuthIntent() ?? redirect ?? "/account";
      navigate({ to: dest as "/" });
    }
  }, [loading, user, redirect, navigate]);

  const applyOptIn = async () => {
    if (!notifyDeals) return;
    try {
      await updateNotifPrefs({ deals: true, email: true });
    } catch {
      /* non-critical */
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");
    setError(null);
    const returnUrl = redirect
      ? `${window.location.origin}/auth?redirect=${encodeURIComponent(redirect)}`
      : window.location.href;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: returnUrl },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  };

  const handleGoogle = async () => {
    setStatus("loading");
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setStatus("error");
      setError(result.error instanceof Error ? result.error.message : String(result.error));
      return;
    }
    if (result.redirected) return;
    await applyOptIn();
    const dest = consumeAuthIntent() ?? redirect ?? "/account";
    navigate({ to: dest as "/" });
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen bg-gradient-to-b from-sand/60 via-background to-background pb-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-gradient-sunset opacity-30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-gradient-ocean opacity-20 blur-3xl"
      />

      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-6 sm:px-8">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <NitziLogo />
        <div className="w-10" />
      </header>

      <div className="mx-auto mt-10 grid w-full max-w-[1600px] gap-10 px-5 sm:px-8 lg:mt-16 lg:grid-cols-2">
        {/* Left: pitch */}
        <div className="hidden flex-col justify-center lg:flex">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> חבר NITZI
          </span>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] text-foreground">
            כל החופשות שלך <br />
            <span className="text-gradient-sunset">במקום אחד</span>
          </h1>
          <ul className="mt-6 space-y-3 text-sm text-foreground">
            <Bullet>גישה לדיל הסודי של NITZI, שמתחלף כל כמה שעות</Bullet>
            <Bullet>שמירת מועדפים, חופשות, והמלצות AI אישיות</Bullet>
            <Bullet>מעקב אחרי הזמנות, מחיר מאומת, ותנאי ביטול</Bullet>
            <Bullet>קבלת עדכונים על דילים חדשים — רק אם תבחר</Bullet>
          </ul>
        </div>

        {/* Right: auth card */}
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border bg-card/95 p-6 shadow-glow backdrop-blur sm:p-8">
          <div className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-2xl font-black text-foreground">ברוך שובך ל-NITZI</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              התחבר במייל או עם Google — לוקח שניות.
            </p>
          </div>

          {status === "sent" ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="mt-2 text-base font-black text-emerald-900">שלחנו לך קישור התחברות</h3>
              <p className="mt-1 text-[12px] text-emerald-800">
                לחץ על הקישור שקיבלת בכתובת <span className="font-black">{email}</span>. תוחזר
                אוטומטית לאותו מקום.
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogle}
                disabled={status === "loading"}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-bold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.09Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                  />
                </svg>
                המשך עם Google
              </button>

              <div className="my-4 flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> או במייל{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleEmail} className="space-y-2">
                <label className="block rounded-2xl border border-border bg-muted/40 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    אימייל
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-0.5 w-full bg-transparent text-sm font-bold text-foreground outline-none"
                  />
                </label>

                <label className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
                  <input
                    type="checkbox"
                    checked={notifyDeals}
                    onChange={(e) => setNotifyDeals(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>אני מעוניין לקבל עדכונים על דילים והצעות מיוחדות.</span>
                </label>

                {error && (
                  <div className="rounded-xl bg-rose-50 p-2 text-[11px] font-bold text-rose-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-sunset py-3 text-sm font-black text-white shadow-glow disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}{" "}
                  שלח קישור התחברות
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-[10px] text-muted-foreground">
            בהתחברות אני מסכים לתנאי השימוש ולמדיניות הפרטיות של NITZI.
          </p>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-sunset" />
      <span>{children}</span>
    </li>
  );
}
