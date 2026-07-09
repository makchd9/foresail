import type { Metadata } from "next";

import { requireWorkspacePage } from "@/server/workspace";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Pipeline health and weighted forecast at a glance.",
};

export default async function DashboardPage() {
  const context = await requireWorkspacePage();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Dashboard" description={`Pipeline health for ${context.workspace.name}`} />
      <div className="p-6 text-sm text-muted-foreground">Analytics coming right up.</div>
    </div>
  );
}
