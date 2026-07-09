import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-4 sm:px-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-2 h-4 w-52" />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
      <div className="space-y-2 px-4 sm:px-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
