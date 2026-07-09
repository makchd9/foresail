import type { Metadata } from "next";

import { requireWorkspacePage } from "@/server/workspace";
import { getBoardData, getDealFormOptions, isWorkspaceEmpty } from "@/server/queries/board";
import { DealsBoard } from "@/components/deals/board";
import { EmptyWorkspace } from "@/components/deals/empty-workspace";
import { PageHeader } from "@/components/page-header";

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Deals"
        description={`Pipeline for ${context.workspace.name}`}
      />
      {workspaceEmpty ? (
        <EmptyWorkspace options={options} canWrite={context.canWrite} currentUserId={context.user.id} />
      ) : (
        <DealsBoard
          stages={stages}
          deals={deals}
          options={options}
          canWrite={context.canWrite}
          currentUserId={context.user.id}
          openNewOnMount={params.new === "1"}
        />
      )}
    </div>
  );
}
