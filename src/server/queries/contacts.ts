import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/list-params";
import { paginate, type CursorValue, type Page } from "@/server/queries/cursor";

export const CONTACT_SORTS = ["name", "createdAt"] as const;

export function contactsWhere(workspaceId: string, q: string): Prisma.ContactWhereInput {
  return {
    workspaceId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const rowSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  title: true,
  notes: true,
  companyId: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
  _count: { select: { deals: { where: { deletedAt: null } } } },
} satisfies Prisma.ContactSelect;

export type ContactRow = Prisma.ContactGetPayload<{ select: typeof rowSelect }>;

export async function getContactsTable(
  workspaceId: string,
  params: ListParams,
): Promise<Page<ContactRow>> {
  const base = contactsWhere(workspaceId, params.q);
  const sortField = params.sort as (typeof CONTACT_SORTS)[number];

  return paginate<ContactRow>({
    after: params.after,
    before: params.before,
    sortField,
    dir: params.dir,
    cursorValue: (row) => row[sortField] as CursorValue,
    fetch: ({ where, orderBy, take }) =>
      db.contact.findMany({
        where: where ? { AND: [base, where as Prisma.ContactWhereInput] } : base,
        orderBy: orderBy as Prisma.ContactOrderByWithRelationInput[],
        take,
        select: rowSelect,
      }),
    count: () => db.contact.count({ where: base }),
  });
}
