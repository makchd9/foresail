import type { Metadata } from "next";
import { Download } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { getBoardData, getDealFormOptions, isWorkspaceEmpty } from "@/server/queries/board";
import { DEAL_SORTS, getDealsTable } from "@/server/queries/deals-table";
import { parseListParams } from "@/lib/list-params";
import { DealsBoard, ViewToggle } from "@/components/deals/board";
import { DealsTable } from "@/components/deals/deals-table";
import { EmptyWorkspace } from "@/components/deals/empty-workspace";
import { FilterSelect } from "@/components/data-table/filter-select";
import { PaginationBar } from "@/components/data-table/pagination-bar";
import { TableSearch } from "@/components/data-table/table-search";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Deals",
  description: "Kanban pipeline with weighted forecasting.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireWorkspacePage();
  const params = await searchParams;
  const view = params.view === "table" ? "table" : "board";

  const [{ stages, deals }, formOptions, workspaceEmpty] = await Promise.all([
    getBoardData(context.workspace.id),
    getDealFormOptions(context.workspace.id),
    isWorkspaceEmpty(context.workspace.id),
  ]);

  const options = {
    stages: stages.map((s) => ({
      id: s.id,
      name: s.name,
      probability: s.probability,
      color: s.color,
      isWon: s.isWon,
      isLost: s.isLost,
    })),
    companies: formOptions.companies,
    contacts: formOptions.contacts,
    members: formOptions.members,
  };

  if (workspaceEmpty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="Deals" description={`Pipeline for ${context.workspace.name}`} />
        <EmptyWorkspace options={options} canWrite={context.canWrite} currentUserId={context.user.id} />
      </div>
    );
  }

  if (view === "table") {
    const listParams = parseListParams(params, {
      defaultSort: "updatedAt",
      allowedSorts: DEAL_SORTS,
    });
    const page = await getDealsTable(context.workspace.id, listParams);
    const exportQs = new URLSearchParams();
    if (listParams.q) exportQs.set("q", listParams.q);
    if (listParams.stage) exportQs.set("stage", listParams.stage);
    if (listParams.owner) exportQs.set("owner", listParams.owner);

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="Deals" description={`Pipeline for ${context.workspace.name}`} />
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <ViewToggle view="table" />
          <TableSearch placeholder="Search deals…" />
          <FilterSelect
            paramKey="stage"
            allLabel="All stages"
            ariaLabel="Filter by stage"
            options={options.stages.map((s) => ({ value: s.id, label: s.name }))}
          />
          <FilterSelect
            paramKey="owner"
            allLabel="All owners"
            ariaLabel="Filter by owner"
            options={options.members.map((m) => ({ value: m.id, label: m.name }))}
          />
          <a
            href={`/api/export/deals${exportQs.size ? `?${exportQs}` : ""}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
            download
          >
            <Download data-icon="inline-start" aria-hidden="true" />
            Export CSV
          </a>
        </div>
        <div className="min-h-0 flex-1">
          <DealsTable
            rows={page.rows}
            total={page.total}
            options={options}
            canWrite={context.canWrite}
            currentUserId={context.user.id}
            params={listParams}
          />
        </div>
        <PaginationBar
          basePath="/app/deals"
          params={listParams}
          view="table"
          total={page.total}
          shown={page.rows.length}
          hasNext={page.hasNext}
          hasPrev={page.hasPrev}
          startCursor={page.startCursor}
          endCursor={page.endCursor}
          noun="deals"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Deals" description={`Pipeline for ${context.workspace.name}`} />
      <DealsBoard
        stages={stages}
        deals={deals}
        options={options}
        canWrite={context.canWrite}
        currentUserId={context.user.id}
        openNewOnMount={params.new === "1"}
      />
    </div>
  );
}
