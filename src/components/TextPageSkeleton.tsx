import { Skeleton } from "@/components/ui/skeleton";

export function TextPageSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-background" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-64 rounded-xl" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
