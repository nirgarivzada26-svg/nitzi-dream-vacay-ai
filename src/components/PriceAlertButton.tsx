// Price alert control — user picks a target price per person; the row is stored
// per user and per deal. Baseline is the live verified price, never invented.

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import type { Deal } from "@/lib/deals";
import { useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/SignInModal";
import { deletePriceAlert, getPriceAlert, upsertPriceAlert } from "@/lib/price-alerts";

const fmtILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export function PriceAlertButton({ deal }: { deal: Deal }) {
  const { user } = useAuth();
  const suggested = Math.max(1, Math.round((deal.price.perPerson * 0.9) / 10) * 10);
  const [open, setOpen] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [target, setTarget] = useState(String(suggested));
  const [active, setActive] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    getPriceAlert(deal.id)
      .then((row) => {
        if (row?.active) {
          setActive(row.target_price);
          setTarget(String(row.target_price));
        } else setActive(null);
      })
      .catch(() => setActive(null));
  }, [user, deal.id]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await upsertPriceAlert({
        dealId: deal.id,
        destinationName: deal.destination.name,
        targetPrice: Number(target),
        baselinePrice: deal.price.perPerson,
      });
      setActive(Number(target));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "לא הצלחנו לשמור את ההתראה");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deletePriceAlert(deal.id);
      setActive(null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => (user ? setOpen((v) => !v) : setSignIn(true))}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
          active
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border hover:border-primary/50"
        }`}
      >
        {active ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {active ? `התראה פעילה מתחת ל-${fmtILS(active)}` : "התראת מחיר"}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <label className="text-[11px] font-black text-muted-foreground">
            עדכנו אותי כשהמחיר לאדם יורד מתחת ל־
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-black"
            />
            <button
              onClick={save}
              disabled={busy}
              className="rounded-xl bg-gradient-sunset px-4 text-xs font-black text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
            </button>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
            המחיר הנוכחי המאומת: {fmtILS(deal.price.perPerson)} לאדם.
          </p>
          {error && <p className="mt-1 text-[11px] font-black text-destructive">{error}</p>}
          {active && (
            <button
              onClick={remove}
              disabled={busy}
              className="mt-2 text-[11px] font-black text-destructive underline"
            >
              ביטול ההתראה
            </button>
          )}
        </div>
      )}

      <SignInModal
        open={signIn}
        onClose={() => setSignIn(false)}
        reason="כדי לפתוח התראת מחיר צריך חשבון NITZI"
        onSignedIn={() => {
          setSignIn(false);
          setOpen(true);
        }}
      />
    </div>
  );
}
