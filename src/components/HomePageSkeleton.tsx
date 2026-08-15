import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6">
        <Skeleton className="h-[320px] w-full rounded-[2rem] sm:h-[420px]" />
        <Skeleton className="mt-6 h-24 w-full rounded-3xl" />

        <div className="mt-10 space-y-3">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-64 shrink-0 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
