import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/list-params";
import { paginate, type CursorValue, type Page } from "@/server/queries/cursor";

const rowSelect = {
  id: true,
  action: true,
  entityType: true,
  entityLabel: true,
  meta: true,
  createdAt: true,
  actor: { select: { name: true } },
} satisfies Prisma.ActivityLogSelect;

export type ActivityLogRow = Prisma.ActivityLogGetPayload<{ select: typeof rowSelect }>;

export async function getActivityPage(
  workspaceId: string,
  params: ListParams,
): Promise<Page<ActivityLogRow>> {
  const base: Prisma.ActivityLogWhereInput = {
    workspaceId,
    ...(params.type ? { entityType: params.type } : {}),
  };

  return paginate<ActivityLogRow>({
    after: params.after,
    before: params.before,
    sortField: "createdAt",
    dir: "desc",
    cursorValue: (row) => row.createdAt as CursorValue,
    fetch: ({ where, orderBy, take }) =>
      db.activityLog.findMany({
        where: where ? { AND: [base, where as Prisma.ActivityLogWhereInput] } : base,
        orderBy: orderBy as Prisma.ActivityLogOrderByWithRelationInput[],
        take,
        select: rowSelect,
      }),
    count: () => db.activityLog.count({ where: base }),
  });
}
