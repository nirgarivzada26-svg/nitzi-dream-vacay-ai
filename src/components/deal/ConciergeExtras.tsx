import { Link } from "@tanstack/react-router";
import { ArrowLeft, PiggyBank, Sparkles } from "lucide-react";
import type { Deal } from "@/lib/deals";
import type { Destination } from "@/lib/catalog";
import { savingTips } from "@/lib/concierge/saving-tips";
import { alternativeDestinations } from "@/lib/concierge/alternative-destinations";
import { conciergeMessage, NO_MESSAGE } from "@/lib/concierge/message";

export function ConciergeSavings({ deal, peers }: { deal: Deal; peers: Deal[] }) {
  const tips = savingTips(deal, peers);
  if (tips.length === 0)
    return (
      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
        אין כרגע הצעות מאומתות נוספות לאותו יעד שמאפשרות להציג טיפ חיסכון אמיתי.
      </p>
    );

  return (
    <ul className="space-y-2">
      {tips.map((t) => (
        <li
          key={t.key}
          className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-black text-foreground">
              <PiggyBank className="h-4 w-4 text-primary" /> {t.title}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{t.detail}</span>
            <span className="block text-[10px] text-muted-foreground/70">מקור: {t.source}</span>
          </span>
          <Link
            to="/deal/$id"
            params={{ id: t.dealId }}
            search={{ flight: undefined }}
            className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary"
          >
            להצעה
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ConciergeAlternatives({
  deal,
  catalog,
}: {
  deal: Deal;
  catalog: Destination[];
}) {
  const alts = alternativeDestinations(deal.destination, catalog);
  if (alts.length === 0)
    return (
      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
        לא נמצאו יעדים דומים מספיק בקטלוג שיש להם כרגע הצעות זמינות.
      </p>
    );

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">
        אם אהבתם את {deal.destination.name} — אולי תאהבו גם:
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {alts.map((a) => (
          <Link
            key={a.destination.slug}
            to="/destination/$slug"
            params={{ slug: a.destination.slug }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-foreground">
                {a.destination.emoji} {a.destination.name}
              </span>
              <span className="block text-xs text-muted-foreground">{a.reasons.join(" · ")}</span>
            </span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ConciergeClosing({ deal, peers }: { deal: Deal; peers: Deal[] }) {
  const msg = conciergeMessage(deal, peers);
  if (!msg)
    return (
      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
        {NO_MESSAGE}
      </p>
    );

  return (
    <div className="rounded-[1.75rem] border border-primary/30 bg-primary/5 p-5">
      <p className="flex items-center gap-2 text-base font-black text-foreground">
        <Sparkles className="h-5 w-5 text-primary" /> {msg.headline}
      </p>
      <ul className="mt-3 space-y-2">
        {msg.reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{r.text}</span>
              <span className="block text-[10px] text-muted-foreground/70">מקור: {r.source}</span>
            </span>
          </li>
        ))}
      </ul>
      {msg.caveat && (
        <p className="mt-3 rounded-xl bg-card px-3 py-2 text-xs font-bold text-muted-foreground">
          {msg.caveat}
        </p>
      )}
    </div>
  );
}
