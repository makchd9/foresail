import type { Metadata } from "next";

import { db } from "@/lib/db";
import { requireWorkspacePage } from "@/server/workspace";
import { hasRole } from "@/lib/rbac";
import { StagesPanel } from "@/components/settings/stages-panel";

export const metadata: Metadata = {
  title: "Pipeline stages",
};

export default async function StagesSettingsPage() {
  const context = await requireWorkspacePage();

  const stages = await db.stage.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { order: "asc" },
    include: { _count: { select: { deals: { where: { deletedAt: null } } } } },
  });

  return (
    <StagesPanel
      stages={stages.map((s) => ({
        id: s.id,
        name: s.name,
        probability: s.probability,
        color: s.color,
        isWon: s.isWon,
        isLost: s.isLost,
        dealCount: s._count.deals,
      }))}
      canManage={hasRole(context.role, "ADMIN")}
      isDemoWorkspace={context.workspace.isDemo}
    />
  );
}
