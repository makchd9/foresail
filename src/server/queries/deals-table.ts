import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/list-params";
import { paginate, type CursorValue, type Page } from "@/server/queries/cursor";

export const DEAL_SORTS = ["updatedAt", "title", "valueCents"] as const;

export type DealsFilter = { q: string; stage: string | null; owner: string | null };

export function dealsWhere(workspaceId: string, filter: DealsFilter): Prisma.DealWhereInput {
  return {
    workspaceId,
    deletedAt: null,
    ...(filter.q ? { title: { contains: filter.q, mode: "insensitive" as const } } : {}),
    ...(filter.stage ? { stageId: filter.stage } : {}),
    ...(filter.owner ? { ownerId: filter.owner } : {}),
  };
}

const rowSelect = {
  id: true,
  title: true,
  valueCents: true,
  stageId: true,
  contactId: true,
  lostReason: true,
  expectedCloseDate: true,
  closedAt: true,
  updatedAt: true,
  createdAt: true,
  ownerId: true,
  companyId: true,
  stage: { select: { name: true, color: true, probability: true, isWon: true, isLost: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.DealSelect;

export type DealTableRow = Prisma.DealGetPayload<{ select: typeof rowSelect }>;

export async function getDealsTable(
  workspaceId: string,
  params: ListParams,
): Promise<Page<DealTableRow>> {
  const base = dealsWhere(workspaceId, params);
  const sortField = params.sort as (typeof DEAL_SORTS)[number];

  return paginate<DealTableRow>({
    after: params.after,
    before: params.before,
    sortField,
    dir: params.dir,
    cursorValue: (row) => row[sortField] as CursorValue,
    fetch: ({ where, orderBy, take }) =>
      db.deal.findMany({
        where: where ? { AND: [base, where as Prisma.DealWhereInput] } : base,
        orderBy: orderBy as Prisma.DealOrderByWithRelationInput[],
        take,
        select: rowSelect,
      }),
    count: () => db.deal.count({ where: base }),
  });
}
