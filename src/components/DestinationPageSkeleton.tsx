import { Skeleton } from "@/components/ui/skeleton";

export function DestinationPageSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
        <Skeleton className="h-[220px] w-full rounded-[2rem] sm:h-[320px]" />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
