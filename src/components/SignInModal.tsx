// Real sign-in modal. Google via the Lovable Cloud broker; email via magic link
// (Supabase OTP-in-email). Phone OTP will slot in here in a future wave.

import { useState } from "react";
import { Mail, X, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { updateNotifPrefs } from "@/lib/user-data";
import { consumeAuthIntent } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function SignInModal({
  open,
  onClose,
  reason,
  onSignedIn,
}: {
  open: boolean;
  onClose: (signedIn: boolean) => void;
  reason?: string;
  onSignedIn?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [notifyDeals, setNotifyDeals] = useState(true);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!open) return null;

  const applyOptIn = async () => {
    if (!notifyDeals) return;
    try {
      await updateNotifPrefs({ deals: true, email: true });
    } catch { /* non-critical */ }
  };

  const finish = async () => {
    await applyOptIn();
    onSignedIn?.();
    const intent = consumeAuthIntent();
    onClose(true);
    if (intent) navigate({ to: intent as "/" });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
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
    if (result.redirected) return; // full-page redirect will resume elsewhere
    await finish();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm animate-fade-up"
      onClick={() => onClose(false)}
    >
      <div
        className="relative w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] border border-border bg-card p-6 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onClose(false)}
          className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-black text-foreground">התחבר ל-NITZI</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reason ?? "כמה פעולות דורשות חשבון — לוקח 10 שניות."}
          </p>
        </div>

        {status === "sent" ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-2 text-base font-black text-emerald-900">שלחנו לך קישור התחברות</h3>
            <p className="mt-1 text-[12px] text-emerald-800">
              בדוק את המייל <span className="font-black">{email}</span> ולחץ על הקישור להתחברות.
              חזור לחלון הזה כשתסיים.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogle}
              disabled={status === "loading"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-3 text-sm font-bold text-foreground transition hover:bg-muted disabled:opacity-60"
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
                <span>אני מעוניין לקבל עדכונים על דילים והצעות מיוחדות. אפשר לבטל בכל רגע.</span>
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

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          בהתחברות אני מסכים לתנאי השימוש ולמדיניות הפרטיות של NITZI.
        </p>
      </div>
    </div>
  );
}
