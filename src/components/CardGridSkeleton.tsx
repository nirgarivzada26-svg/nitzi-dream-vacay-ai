// Shared `pendingComponent` for the three "grid/list of result cards" pages
// (/packages, /flights, /result) — their loading shape is similar enough
// (top nav + filter bar + a grid of cards) to reuse one skeleton instead of
// three near-identical ones.

import { Skeleton } from "@/components/ui/skeleton";

export function CardGridSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
