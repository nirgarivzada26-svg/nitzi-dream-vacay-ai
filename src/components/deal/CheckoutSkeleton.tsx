// Shown by the checkout route as `pendingComponent` while its loader
// (catalog fetch) is in flight. Purely presentational — no data, no state.

import { Skeleton } from "@/components/ui/skeleton";

export function CheckoutSkeleton() {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-sand/60 via-background to-background pb-20"
      aria-hidden="true"
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 pt-6 sm:px-10">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <div className="w-11" />
      </div>

      <div className="mx-auto mt-8 w-full max-w-[1600px] px-5 sm:px-10">
        <Skeleton className="h-9 w-full max-w-md rounded-2xl" />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
            <Skeleton className="h-8 w-40 rounded-xl" />
            <div className="mt-6 space-y-4">
              <Skeleton className="h-40 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-96 rounded-[2rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
