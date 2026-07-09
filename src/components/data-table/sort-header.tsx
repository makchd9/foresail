import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { listQueryString, type ListParams } from "@/lib/list-params";
import { cn } from "@/lib/utils";

/** Column header link that toggles sort field/direction via the URL. */
export function SortHeader({
  label,
  field,
  params,
  basePath,
  view,
  defaultDir = "asc",
  align = "left",
}: {
  label: string;
  field: string;
  params: ListParams;
  basePath: string;
  view?: string;
  defaultDir?: "asc" | "desc";
  align?: "left" | "right";
}) {
  const active = params.sort === field;
  const nextDir = active ? (params.dir === "asc" ? "desc" : "asc") : defaultDir;
  const href =
    basePath +
    listQueryString({ ...params, view }, { sort: field, dir: nextDir, after: null, before: null });

  return (
    <Link
      href={href}
      aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm text-xs font-medium transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "flex-row-reverse",
      )}
    >
      {label}
      {active ? (
        params.dir === "asc" ? (
          <ArrowUp className="size-3" aria-hidden="true" />
        ) : (
          <ArrowDown className="size-3" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
      )}
    </Link>
  );
}
