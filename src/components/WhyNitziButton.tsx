import { useState } from "react";
import { Sparkles, X, Wand2 } from "lucide-react";

interface Props {
  title?: string;
  reasons: string[]; // bullet reasons
  score?: number; // 0-100 match
  extra?: React.ReactNode; // optional richer content
  /** Optional custom trigger (e.g. an icon button on a card). */
  trigger?: (open: () => void) => React.ReactNode;
}

export function WhyNitziButton({
  title = "למה NITZI בחר בזה?",
  reasons,
  score,
  extra,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-black text-primary transition hover:bg-primary/20"
        >
          <Wand2 className="h-3.5 w-3.5" /> למה NITZI בחר?
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[110] grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          onClick={() => setOpen(false)}
          dir="rtl"
        >
          <div
            className="relative w-full max-w-lg rounded-t-3xl bg-background p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="סגור"
              className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-card"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-sunset text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-foreground">{title}</h3>
                {score != null && (
                  <p className="text-xs font-bold text-primary">ציון התאמה: {score}%</p>
                )}
              </div>
            </div>

            <ul className="mt-5 space-y-2.5 text-sm">
              {reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 rounded-2xl border border-border/60 bg-muted/40 p-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-sunset text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{r}</span>
                </li>
              ))}
            </ul>

            {extra && <div className="mt-4">{extra}</div>}

            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              ה-AI של NITZI ניתח את התקציב, סגנון החופשה, סוג הנסיעה, מספר הנוסעים והדירוגים כדי
              להגיע לבחירה הזו.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
