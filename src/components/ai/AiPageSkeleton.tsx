// Shared `pendingComponent` for /ai and /ai/:conversationId — both render
// the same AgentChat shell, so one skeleton covers both.

import { Skeleton } from "@/components/ui/skeleton";

export function AiPageSkeleton() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background" aria-hidden="true">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <div className="flex min-h-0 flex-1 flex-col items-center px-4 py-10 sm:px-6">
          <Skeleton className="h-16 w-16 rounded-3xl" />
          <Skeleton className="mt-4 h-6 w-64 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-80 rounded-lg" />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-36 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="hidden w-72 shrink-0 border-s border-border/60 p-4 lg:block">
          <Skeleton className="h-8 w-full rounded-xl" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-3 sm:px-6">
        <Skeleton className="mx-auto h-14 w-full max-w-3xl rounded-2xl" />
      </div>
    </div>
  );
}
