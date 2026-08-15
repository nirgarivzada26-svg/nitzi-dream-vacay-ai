// Shown by the /deal/$id route as `pendingComponent` while its loader
// (catalog fetch) is in flight. Purely presentational — no data, no state.
// Mirrors the real page's rough shape (hero, at-a-glance strip, sticky
// panel) so the transition into real content doesn't jump around.

import { Skeleton } from "@/components/ui/skeleton";

export function DealPageSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32 lg:pb-12" aria-hidden="true">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 lg:pt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <main className="min-w-0 space-y-5">
            <Skeleton className="h-[280px] w-full rounded-[2rem] sm:h-[420px] lg:h-[480px]" />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-2xl" />
              ))}
            </div>

            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </main>

          <aside className="hidden lg:block">
            <Skeleton className="h-80 rounded-3xl" />
          </aside>
        </div>
      </div>
    </div>
  );
}
