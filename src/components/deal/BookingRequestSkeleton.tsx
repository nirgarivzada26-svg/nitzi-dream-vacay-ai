// Shown by the booking-request route as `pendingComponent` while its
// loader (catalog fetch) is in flight. Purely presentational.

import { Skeleton } from "@/components/ui/skeleton";

export function BookingRequestSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32" aria-hidden="true">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <span className="w-10" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1000px] space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-lg" />
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </main>
    </div>
  );
}
