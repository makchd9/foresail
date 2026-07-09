import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/list-params";
import { paginate, type CursorValue, type Page } from "@/server/queries/cursor";

export const COMPANY_SORTS = ["name", "createdAt"] as const;

export function companiesWhere(workspaceId: string, q: string): Prisma.CompanyWhereInput {
  return {
    workspaceId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { domain: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const rowSelect = {
  id: true,
  name: true,
  domain: true,
  industry: true,
  size: true,
  location: true,
  notes: true,
  createdAt: true,
  _count: {
    select: {
      contacts: true,
      deals: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.CompanySelect;

export type CompanyRow = Prisma.CompanyGetPayload<{ select: typeof rowSelect }>;

export async function getCompaniesTable(
  workspaceId: string,
  params: ListParams,
): Promise<Page<CompanyRow>> {
  const base = companiesWhere(workspaceId, params.q);
  const sortField = params.sort as (typeof COMPANY_SORTS)[number];

  return paginate<CompanyRow>({
    after: params.after,
    before: params.before,
    sortField,
    dir: params.dir,
    cursorValue: (row) => row[sortField] as CursorValue,
    fetch: ({ where, orderBy, take }) =>
      db.company.findMany({
        where: where ? { AND: [base, where as Prisma.CompanyWhereInput] } : base,
        orderBy: orderBy as Prisma.CompanyOrderByWithRelationInput[],
        take,
        select: rowSelect,
      }),
    count: () => db.company.count({ where: base }),
  });
}
