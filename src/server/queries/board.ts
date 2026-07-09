import "server-only";

import { db } from "@/lib/db";

export type BoardStage = {
  id: string;
  name: string;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
  order: number;
};

export type BoardDeal = {
  id: string;
  title: string;
  valueCents: number;
  position: number;
  stageId: string;
  contactId: string | null;
  lostReason: string | null;
  expectedCloseDate: Date | null;
  closedAt: Date | null;
  company: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
};

export type SelectOption = { id: string; name: string };

export async function getBoardData(workspaceId: string): Promise<{
  stages: BoardStage[];
  deals: BoardDeal[];
}> {
  const [stages, deals] = await Promise.all([
    db.stage.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        probability: true,
        color: true,
        isWon: true,
        isLost: true,
        order: true,
      },
    }),
    db.deal.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { position: "asc" },
      select: {
        id: true,
        title: true,
        valueCents: true,
        position: true,
        stageId: true,
        contactId: true,
        lostReason: true,
        expectedCloseDate: true,
        closedAt: true,
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { stages, deals };
}

/** Lightweight option lists for the deal form selects. */
export async function getDealFormOptions(workspaceId: string): Promise<{
  companies: SelectOption[];
  contacts: Array<SelectOption & { companyId: string | null }>;
  members: SelectOption[];
}> {
  const [companies, contacts, memberships] = await Promise.all([
    db.company.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    db.contact.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, companyId: true },
      take: 500,
    }),
    db.membership.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { user: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    companies,
    contacts,
    members: memberships.map((m) => m.user),
  };
}

/** True when the workspace has never had any deals/contacts/companies (fresh workspace). */
export async function isWorkspaceEmpty(workspaceId: string): Promise<boolean> {
  const [deals, contacts, companies] = await Promise.all([
    db.deal.count({ where: { workspaceId } }),
    db.contact.count({ where: { workspaceId } }),
    db.company.count({ where: { workspaceId } }),
  ]);
  return deals === 0 && contacts === 0 && companies === 0;
}
