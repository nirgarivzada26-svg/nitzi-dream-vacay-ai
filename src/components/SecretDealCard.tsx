import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Flame, Lock, Sparkles, Timer } from "lucide-react";
import { getSecretDeal } from "@/lib/deals";
import { useDestinations } from "@/lib/use-catalog";
import { DestinationImage } from "@/components/DestinationImage";
import { setAuthIntent, useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/SignInModal";

function formatCountdown(ms: number) {
  if (ms <= 0) return "מתרענן…";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}ש׳ ${String(m).padStart(2, "0")}ד׳`;
}

export function SecretDealCard() {
  const navigate = useNavigate();
  const catalog = useDestinations();
  const secret = useMemo(() => getSecretDeal(catalog), [catalog]);
  const { isAuthenticated } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  // Null until hydration so server and client render the same markup.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const openDeal = () =>
    secret &&
    navigate({ to: "/deal/$id", params: { id: secret.deal.id }, search: { flight: undefined } });

  const handleClick = () => {
    if (!secret) return;
    if (isAuthenticated) openDeal();
    else {
      setAuthIntent(`/deal/${secret.deal.id}`);
      setSignInOpen(true);
    }
  };

  // No supplier offer available right now — we say so rather than fake a deal.
  if (!secret) return null;

  const { deal, nextRotationAt } = secret;

  return (
    <section className="px-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/30 bg-card shadow-glow animate-fade-up">
        <div className="relative h-[240px] w-full sm:h-[300px] lg:h-[380px]">
          <DestinationImage
            destination={deal.destination}
            className={`h-full w-full object-cover transition ${isAuthenticated ? "" : "blur-md scale-110"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />

          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-gradient-sunset px-3 py-1.5 text-[11px] font-black text-white shadow-glow">
            <Flame className="h-3.5 w-3.5" /> הדיל הסודי של NITZI
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
            <Timer className="h-3 w-3" /> מתחלף בעוד{" "}
            {now === null ? "—" : formatCountdown(nextRotationAt.getTime() - now)}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            {isAuthenticated ? (
              <>
                <p className="text-[11px] font-bold text-white/85">
                  {deal.destination.country} {deal.destination.emoji}
                </p>
                <h3 className="text-2xl font-black leading-tight sm:text-3xl">
                  {deal.destination.name}
                </h3>
                <p className="mt-1 line-clamp-2 max-w-md text-xs text-white/90 sm:text-sm">
                  {deal.title}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                      מחיר לאדם
                    </div>
                    <div className="text-3xl font-black leading-none">
                      ₪{deal.price.perPerson.toLocaleString()}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-black">
                    ✓ מחיר נבדק ואומת
                  </span>
                  <button
                    onClick={handleClick}
                    className="ms-auto flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-foreground shadow-glow active:scale-95"
                  >
                    <Sparkles className="h-4 w-4 text-primary" /> לפרטים והזמנה
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-2 text-xl font-black sm:text-2xl">
                  הדיל הסודי זמין לחברי NITZI בלבד
                </h3>
                <p className="mt-1 text-xs text-white/85 sm:text-sm">
                  התחבר או הירשם בחינם כדי לחשוף את היעד והמחיר הבלעדי.
                </p>
                <button
                  onClick={handleClick}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-foreground shadow-glow active:scale-95"
                >
                  <Lock className="h-4 w-4 text-primary" /> חשוף את הדיל
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SignInModal
        open={signInOpen}
        onClose={(signed) => {
          setSignInOpen(false);
          if (signed) openDeal();
        }}
        reason="הדיל הסודי זמין לחברי NITZI בלבד."
      />
    </section>
  );
}
