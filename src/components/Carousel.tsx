import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal rail with drag-to-scroll, snap, and RTL-aware arrows.
 */
export function Carousel({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const drag = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const abs = Math.abs(el.scrollLeft);
    setCanPrev(abs > 4);
    setCanNext(abs < max - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByDir = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: -Math.round(el.clientWidth * 0.85) * dir, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    // Pointer capture is claimed only once a real drag starts — capturing on
    // pointerdown would retarget the click and swallow taps on cards/buttons.
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4 && !drag.current.moved) {
      drag.current.moved = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    if (!drag.current.moved) return;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    drag.current.active = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-12 left-0 z-10 hidden items-center gap-1.5 sm:flex">
        <button
          aria-label="הקודם"
          disabled={!canPrev}
          onClick={() => scrollByDir(-1)}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-soft transition hover:border-primary disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          aria-label="הבא"
          disabled={!canNext}
          onClick={() => scrollByDir(1)}
          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-soft transition hover:border-primary disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={ref}
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 scroll-smooth select-none [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
