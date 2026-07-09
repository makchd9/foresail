import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { listQueryString, type ListParams } from "@/lib/list-params";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaginationBar({
  basePath,
  params,
  view,
  total,
  shown,
  hasNext,
  hasPrev,
  startCursor,
  endCursor,
  noun,
}: {
  basePath: string;
  params: ListParams;
  view?: string;
  total: number;
  shown: number;
  hasNext: boolean;
  hasPrev: boolean;
  startCursor: string | null;
  endCursor: string | null;
  noun: string;
}) {
  const disabledClasses = "pointer-events-none opacity-50";
  const linkClasses = cn(buttonVariants({ variant: "outline", size: "sm" }));

  const prevHref =
    basePath + listQueryString({ ...params, view }, { after: null, before: startCursor });
  const nextHref =
    basePath + listQueryString({ ...params, view }, { after: endCursor, before: null });

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t px-4 py-3 sm:px-6"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {total === 0
          ? `0 ${noun}`
          : `Showing ${shown} of ${total.toLocaleString("en-US")} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        {hasPrev && startCursor ? (
          <Link href={prevHref} className={linkClasses} rel="prev">
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClasses, disabledClasses)}>
            <ChevronLeft data-icon="inline-start" aria-hidden="true" />
            Previous
          </span>
        )}
        {hasNext && endCursor ? (
          <Link href={nextHref} className={linkClasses} rel="next">
            Next
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClasses, disabledClasses)}>
            Next
            <ChevronRight data-icon="inline-end" aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
