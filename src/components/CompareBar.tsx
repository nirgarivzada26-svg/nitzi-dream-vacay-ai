import { Link } from "@tanstack/react-router";
import { GitCompare, X } from "lucide-react";
import { clearCompare, useCompare } from "@/lib/compare-store";

export function CompareBar() {
  const items = useCompare();
  if (items.length < 2) return null;
  const kind = items[0].kind;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full bg-foreground/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-black">
        <GitCompare className="h-4 w-4" />
        {items.length} {kind === "hotel" ? "מלונות" : "חבילות"} להשוואה
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/compare"
          className="rounded-full bg-gradient-sunset px-4 py-2 text-xs font-black shadow-glow"
        >
          פתח השוואה ←
        </Link>
        <button
          onClick={clearCompare}
          aria-label="נקה"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
