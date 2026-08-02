// Action rail rendered on top of a package card. Every action completes in
// place — the user never leaves the page they are browsing. Clicking the card
// itself still opens the canonical package page.

import { useEffect, useState } from "react";
import { Bell, Eye, GitCompare, Heart, Share2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { Deal } from "@/lib/deals";
import { useAuth } from "@/lib/auth";
import { SignInModal } from "@/components/SignInModal";
import { addFavorite, isDealFavorited, removeFavorite } from "@/lib/user-data";
import { isCompared, toggleCompare, useCompare } from "@/lib/compare-store";
import { shareDeal } from "@/lib/share-deal";
import { dealReasons, nitziScore } from "@/lib/deal-insights";
import { DealQuickView } from "@/components/DealQuickView";
import { WhyNitziButton } from "@/components/WhyNitziButton";
import { PriceAlertButton } from "@/components/PriceAlertButton";

export function DealCardActions({ deal, openQuickViewSignal }: { deal: Deal; openQuickViewSignal?: number }) {
  const { user } = useAuth();
  const compare = useCompare();
  const compared = isCompared(deal.id, "package");

  const [fav, setFav] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [quickView, setQuickView] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setFav(false);
      return;
    }
    isDealFavorited(deal.id).then(setFav);
  }, [user, deal.id]);

  useEffect(() => {
    if (openQuickViewSignal) setQuickView(true);
  }, [openQuickViewSignal]);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onFavorite = async () => {
    if (!user) return setSignIn(true);
    try {
      if (fav) {
        await removeFavorite(deal.id);
        setFav(false);
        toast("הוסר מהמועדפים");
      } else {
        await addFavorite(deal);
        setFav(true);
        toast.success("נשמר למועדפים ❤️");
      }
    } catch {
      toast.error("לא הצלחנו לעדכן את המועדפים");
    }
  };

  const onCompare = () => {
    toggleCompare({ id: deal.id, kind: "package" });
    toast(compared ? "הוסר מההשוואה" : "נוסף להשוואה 🔄");
  };

  const onShare = async () => {
    const res = await shareDeal(deal);
    if (res === "copied") toast.success("הקישור הועתק 📤");
    if (res === "failed") toast.error("השיתוף לא נתמך בדפדפן הזה");
  };

  return (
    <>
      <div
        className="absolute left-2 top-12 z-20 flex flex-col gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        onClick={stop}
      >
        <IconBtn label="שמור למועדפים" active={fav} onClick={onFavorite}>
          <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
        </IconBtn>
        <IconBtn label="תצוגה מהירה" onClick={() => setQuickView(true)}>
          <Eye className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="השווה" active={compared} onClick={onCompare}>
          <GitCompare className="h-4 w-4" />
        </IconBtn>
        <WhyNitziButton
          reasons={dealReasons(deal)}
          score={nitziScore(deal)}
          title={`למה NITZI ממליץ על ${deal.destination.name}?`}
          trigger={(open) => (
            <IconBtn label="למה NITZI ממליץ" onClick={open}>
              <Wand2 className="h-4 w-4" />
            </IconBtn>
          )}
        />
        <IconBtn label="שתף" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="התראת מחיר" onClick={() => setAlertOpen(true)}>
          <Bell className="h-4 w-4" />
        </IconBtn>
      </div>

      {/* Desktop hover hint that also opens the preview */}
      <button
        onClick={(e) => {
          stop(e);
          setQuickView(true);
        }}
        className="absolute bottom-[calc(100%-14rem)] right-3 z-20 hidden items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 sm:inline-flex"
      >
        <Eye className="h-3.5 w-3.5" /> תצוגה מהירה
      </button>

      {quickView && (
        <div onClick={stop}>
          <DealQuickView
            deal={deal}
            onClose={() => setQuickView(false)}
            onToggleFavorite={onFavorite}
            favorited={fav}
            onToggleCompare={onCompare}
            compared={compare.some((c) => c.id === deal.id && c.kind === "package")}
            onShare={onShare}
          />
        </div>
      )}

      {alertOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            stop(e);
            setAlertOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl"
            onClick={stop}
          >
            <h4 className="text-sm font-black text-foreground">
              התראת מחיר · {deal.destination.name}
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              נעדכן אותך ברגע שהמחיר לאדם יירד מתחת לסכום שתבחר.
            </p>
            <div className="mt-3">
              <PriceAlertButton deal={deal} />
            </div>
            <button
              onClick={() => setAlertOpen(false)}
              className="mt-3 w-full rounded-2xl border border-border py-2.5 text-xs font-black"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {signIn && (
        <div onClick={stop}>
          <SignInModal open onClose={() => setSignIn(false)} onSignedIn={() => setSignIn(false)} />
        </div>
      )}
    </>
  );
}

function IconBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full border shadow-soft backdrop-blur transition active:scale-95 ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/60 bg-white/90 text-foreground hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
