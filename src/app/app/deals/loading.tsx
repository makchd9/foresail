import { Skeleton } from "@/components/ui/skeleton";

/** Board-shaped skeleton so the layout doesn't shift when data lands. */
export default function DealsLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden px-4 pb-4 sm:px-6">
        {Array.from({ length: 5 }).map((_, column) => (
          <div key={column} className="flex w-[272px] shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 3 + (column % 2) }).map((_, card) => (
              <Skeleton key={card} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
