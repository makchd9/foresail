import type { Metadata } from "next";
import { History } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { getActivityPage } from "@/server/queries/activity";
import { parseListParams } from "@/lib/list-params";
import { ENTITY_TYPES } from "@/lib/activity";
import { ActivityItem } from "@/components/activity-item";
import { EmptyState } from "@/components/empty-state";
import { FilterSelect } from "@/components/data-table/filter-select";
import { PaginationBar } from "@/components/data-table/pagination-bar";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Activity",
  description: "The immutable audit trail for your workspace.",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireWorkspacePage();
  const params = await searchParams;
  const listParams = parseListParams(params, {
    defaultSort: "createdAt",
    allowedSorts: ["createdAt"],
  });
  if (listParams.type && !ENTITY_TYPES.includes(listParams.type as (typeof ENTITY_TYPES)[number])) {
    listParams.type = null;
  }

  const page = await getActivityPage(context.workspace.id, listParams);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Activity"
        description="Every change, who made it, and when — append-only"
      />
      <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
        <FilterSelect
          paramKey="type"
          allLabel="All types"
          ariaLabel="Filter by entity type"
          options={ENTITY_TYPES.map((t) => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) + "s" }))}
        />
      </div>
      <div className="min-h-0 flex-1 px-4 sm:px-6">
        {page.rows.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" aria-hidden="true" />}
            title="No activity recorded"
            description="Actions in this workspace will show up here as an immutable trail."
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-card px-4">
            {page.rows.map((row) => (
              <ActivityItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>
      <PaginationBar
        basePath="/app/activity"
        params={listParams}
        total={page.total}
        shown={page.rows.length}
        hasNext={page.hasNext}
        hasPrev={page.hasPrev}
        startCursor={page.startCursor}
        endCursor={page.endCursor}
        noun="events"
      />
    </div>
  );
}
