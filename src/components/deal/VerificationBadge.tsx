import { BadgeCheck, CircleAlert, Info, ShieldQuestion, XCircle } from "lucide-react";
import type { VerificationPresentation } from "@/lib/deal-verification";
import { TONE_CLASS } from "@/lib/deal-verification";

const ICON = {
  verified_live: BadgeCheck,
  verified_catalog: BadgeCheck,
  demo: Info,
  stale: ShieldQuestion,
  unavailable: XCircle,
} as const;

export function VerificationBadge({
  v,
  compact = false,
  updatedLabel,
  onRefresh,
}: {
  v: VerificationPresentation;
  compact?: boolean;
  updatedLabel?: string;
  onRefresh?: () => void;
}) {
  const Icon = ICON[v.state] ?? CircleAlert;
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${TONE_CLASS[v.tone]}`}
      >
        <Icon className="h-3 w-3" aria-hidden />
        <span>{v.label}</span>
      </span>
    );
  }
  return (
    <div
      className={`rounded-3xl border p-4 shadow-soft ${TONE_CLASS[v.tone]}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-sm font-black">{v.label}</span>
        {updatedLabel && <span className="text-[11px] font-semibold">· עודכן {updatedLabel}</span>}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="ms-auto rounded-full border border-current/30 bg-white/70 px-3 py-1 text-[11px] font-bold"
          >
            בדוק מחיר עכשיו
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[12px] font-semibold opacity-90">{v.detail}</p>
    </div>
  );
}
