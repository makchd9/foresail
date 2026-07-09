import "server-only";

import { db } from "@/lib/db";

export async function getDealDetail(workspaceId: string, dealId: string) {
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId, deletedAt: null },
    include: {
      stage: true,
      company: { select: { id: true, name: true, domain: true } },
      contact: { select: { id: true, name: true, email: true, title: true } },
      owner: { select: { id: true, name: true } },
      notesList: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
        take: 100,
      },
    },
  });
  if (!deal) return null;

  const activity = await db.activityLog.findMany({
    where: { workspaceId, entityType: "deal", entityId: dealId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
    take: 50,
  });

  return { deal, activity };
}
