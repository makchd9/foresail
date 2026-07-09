"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import {
  dealFormSchema,
  dealUpdateSchema,
  dollarsToCents,
  moveDealSchema,
  noteFormSchema,
  type MoveDealInput,
} from "@/lib/validators/deal";
import { logActivity } from "@/server/activity";
import { getActionContext } from "@/server/workspace";
import { seedSampleData } from "@/server/demo/seed-demo";

function revalidateDealViews(dealId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/deals");
  if (dealId) revalidatePath(`/app/deals/${dealId}`);
}

/** Confirm every referenced record belongs to this workspace before writing. */
async function validateRelations(
  workspaceId: string,
  input: { stageId?: string; companyId?: string | null; contactId?: string | null; ownerId?: string | null },
): Promise<string | null> {
  if (input.stageId) {
    const stage = await db.stage.findFirst({ where: { id: input.stageId, workspaceId }, select: { id: true } });
    if (!stage) return "That stage doesn't exist in this workspace.";
  }
  if (input.companyId) {
    const company = await db.company.findFirst({ where: { id: input.companyId, workspaceId }, select: { id: true } });
    if (!company) return "That company doesn't exist in this workspace.";
  }
  if (input.contactId) {
    const contact = await db.contact.findFirst({ where: { id: input.contactId, workspaceId }, select: { id: true } });
    if (!contact) return "That contact doesn't exist in this workspace.";
  }
  if (input.ownerId) {
    const membership = await db.membership.findFirst({
      where: { workspaceId, userId: input.ownerId },
      select: { id: true },
    });
    if (!membership) return "The deal owner must be a workspace member.";
  }
  return null;
}

// ---------- Create ----------

export async function createDealAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = dealFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const relationError = await validateRelations(context.workspace.id, input);
  if (relationError) return fail(relationError);

  const stage = await db.stage.findFirst({
    where: { id: input.stageId, workspaceId: context.workspace.id },
  });
  if (!stage) return fail("That stage doesn't exist in this workspace.");

  const last = await db.deal.findFirst({
    where: { workspaceId: context.workspace.id, stageId: stage.id, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const isClosed = stage.isWon || stage.isLost;
  const deal = await db.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        workspaceId: context.workspace.id,
        title: input.title,
        valueCents: dollarsToCents(input.value),
        stageId: stage.id,
        companyId: input.companyId,
        contactId: input.contactId,
        ownerId: input.ownerId ?? context.user.id,
        expectedCloseDate: input.expectedCloseDate,
        position: (last?.position ?? 0) + 1024,
        closedAt: isClosed ? new Date() : null,
      },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "deal.created",
        entityType: "deal",
        entityId: created.id,
        entityLabel: created.title,
        meta: { stage: stage.name, valueCents: created.valueCents },
      },
      tx,
    );
    return created;
  });

  revalidateDealViews();
  return ok({ id: deal.id });
}

// ---------- Update ----------

export async function updateDealAction(
  dealId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = dealUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId: context.workspace.id, deletedAt: null },
    include: { stage: true },
  });
  if (!deal) return fail("This deal no longer exists.");

  const relationError = await validateRelations(context.workspace.id, input);
  if (relationError) return fail(relationError);

  const nextStage =
    input.stageId === deal.stageId
      ? deal.stage
      : await db.stage.findFirst({ where: { id: input.stageId, workspaceId: context.workspace.id } });
  if (!nextStage) return fail("That stage doesn't exist in this workspace.");

  const stageChanged = nextStage.id !== deal.stageId;
  const wasClosed = deal.stage.isWon || deal.stage.isLost;
  const nowClosed = nextStage.isWon || nextStage.isLost;

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        title: input.title,
        valueCents: dollarsToCents(input.value),
        stageId: nextStage.id,
        companyId: input.companyId,
        contactId: input.contactId,
        ownerId: input.ownerId,
        expectedCloseDate: input.expectedCloseDate,
        lostReason: nextStage.isLost ? input.lostReason : null,
        closedAt: nowClosed ? (deal.closedAt ?? new Date()) : null,
      },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "deal.updated",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: input.title,
      },
      tx,
    );
    if (stageChanged) {
      await logActivity(
        {
          workspaceId: context.workspace.id,
          actorId: context.user.id,
          action: nextStage.isWon ? "deal.won" : nextStage.isLost ? "deal.lost" : "deal.stage_changed",
          entityType: "deal",
          entityId: deal.id,
          entityLabel: input.title,
          meta: { from: deal.stage.name, to: nextStage.name },
        },
        tx,
      );
    }
    void wasClosed;
  });

  revalidateDealViews(deal.id);
  return ok({ id: deal.id });
}

// ---------- Move (kanban drag or stage select) ----------

export async function moveDealAction(rawInput: MoveDealInput): Promise<ActionResult<{ position: number }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = moveDealSchema.safeParse(rawInput);
  if (!parsed.success) return invalid(parsed.error);
  const { dealId, stageId, prevDealId, nextDealId } = parsed.data;
  const workspaceId = context.workspace.id;

  const [deal, stage] = await Promise.all([
    db.deal.findFirst({
      where: { id: dealId, workspaceId, deletedAt: null },
      include: { stage: true },
    }),
    db.stage.findFirst({ where: { id: stageId, workspaceId } }),
  ]);
  if (!deal) return fail("This deal no longer exists.");
  if (!stage) return fail("That stage doesn't exist in this workspace.");

  async function neighborPosition(id: string | null | undefined): Promise<number | null> {
    if (!id) return null;
    const neighbor = await db.deal.findFirst({
      where: { id, workspaceId, stageId, deletedAt: null },
      select: { position: true },
    });
    return neighbor?.position ?? null;
  }

  const [prevPos, nextPos] = await Promise.all([
    neighborPosition(prevDealId),
    neighborPosition(nextDealId),
  ]);

  let position: number;
  if (prevPos !== null && nextPos !== null) {
    position = (prevPos + nextPos) / 2;
  } else if (prevPos !== null) {
    position = prevPos + 1024;
  } else if (nextPos !== null) {
    position = nextPos - 1024;
  } else {
    const last = await db.deal.findFirst({
      where: { workspaceId, stageId, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    position = (last?.position ?? 0) + 1024;
  }

  // Float exhaustion guard: renormalize the column, then land after prev.
  if ((prevPos !== null && position === prevPos) || (nextPos !== null && position === nextPos)) {
    const column = await db.deal.findMany({
      where: { workspaceId, stageId, deletedAt: null },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await db.$transaction(
      column.map((row, index) =>
        db.deal.update({ where: { id: row.id }, data: { position: (index + 1) * 1024 } }),
      ),
    );
    const prevIndex = column.findIndex((row) => row.id === prevDealId);
    position = (prevIndex + 1) * 1024 + 512;
  }

  const stageChanged = stage.id !== deal.stageId;
  const nowClosed = stage.isWon || stage.isLost;

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        stageId: stage.id,
        position,
        closedAt: nowClosed ? (deal.closedAt ?? new Date()) : null,
        lostReason: stage.isLost ? deal.lostReason : null,
      },
    });
    if (stageChanged) {
      await logActivity(
        {
          workspaceId,
          actorId: context.user.id,
          action: stage.isWon ? "deal.won" : stage.isLost ? "deal.lost" : "deal.stage_changed",
          entityType: "deal",
          entityId: deal.id,
          entityLabel: deal.title,
          meta: { from: deal.stage.name, to: stage.name },
        },
        tx,
      );
    }
  });

  revalidateDealViews(deal.id);
  return ok({ position });
}

// ---------- Delete / restore ----------

export async function softDeleteDealAction(dealId: string): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId: context.workspace.id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!deal) return fail("This deal no longer exists.");

  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: deal.id }, data: { deletedAt: new Date() } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "deal.deleted",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: deal.title,
      },
      tx,
    );
  });

  revalidateDealViews(deal.id);
  return ok(null);
}

export async function restoreDealAction(dealId: string): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId: context.workspace.id, deletedAt: { not: null } },
    select: { id: true, title: true },
  });
  if (!deal) return fail("Nothing to restore.");

  await db.$transaction(async (tx) => {
    await tx.deal.update({ where: { id: deal.id }, data: { deletedAt: null } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "deal.restored",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: deal.title,
      },
      tx,
    );
  });

  revalidateDealViews(deal.id);
  return ok(null);
}

// ---------- Notes ----------

export async function addNoteAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = noteFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const deal = await db.deal.findFirst({
    where: { id: parsed.data.dealId, workspaceId: context.workspace.id, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!deal) return fail("This deal no longer exists.");

  await db.$transaction(async (tx) => {
    await tx.note.create({
      data: { dealId: deal.id, authorId: context.user.id, body: parsed.data.body },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "note.created",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: deal.title,
      },
      tx,
    );
  });

  revalidatePath(`/app/deals/${deal.id}`);
  return ok(null);
}

// ---------- Sample data for fresh workspaces ----------

export async function loadSampleDataAction(): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const dealCount = await db.deal.count({ where: { workspaceId: context.workspace.id } });
  if (dealCount > 0) return fail("This workspace already has deals.");

  await seedSampleData(db, context.workspace.id, context.user.id);
  revalidateDealViews();
  revalidatePath("/app/contacts");
  revalidatePath("/app/companies");
  return ok(null);
}

// ---------- Bulk actions (table view) ----------

const BULK_LIMIT = 500;

export type BulkTarget =
  | { mode: "ids"; ids: string[] }
  | { mode: "filter"; q: string; stage: string | null; owner: string | null };

async function resolveBulkDealIds(
  workspaceId: string,
  target: BulkTarget,
): Promise<{ ids: string[] } | { error: string }> {
  const { dealsWhere } = await import("@/server/queries/deals-table");
  if (target.mode === "ids") {
    if (target.ids.length === 0) return { error: "Nothing selected." };
    if (target.ids.length > BULK_LIMIT) return { error: `Bulk actions are capped at ${BULK_LIMIT} deals.` };
    const rows = await db.deal.findMany({
      where: { workspaceId, deletedAt: null, id: { in: target.ids } },
      select: { id: true },
    });
    return { ids: rows.map((r) => r.id) };
  }
  const rows = await db.deal.findMany({
    where: dealsWhere(workspaceId, { q: target.q, stage: target.stage, owner: target.owner }),
    select: { id: true },
    take: BULK_LIMIT + 1,
  });
  if (rows.length > BULK_LIMIT) return { error: `Bulk actions are capped at ${BULK_LIMIT} deals — narrow the filter.` };
  return { ids: rows.map((r) => r.id) };
}

export async function bulkDeleteDealsAction(target: BulkTarget): Promise<ActionResult<{ count: number }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const resolved = await resolveBulkDealIds(context.workspace.id, target);
  if ("error" in resolved) return fail(resolved.error);
  if (resolved.ids.length === 0) return fail("Nothing to delete.");

  await db.$transaction(async (tx) => {
    await tx.deal.updateMany({
      where: { id: { in: resolved.ids }, workspaceId: context.workspace.id },
      data: { deletedAt: new Date() },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "deal.deleted",
        entityType: "deal",
        entityLabel: `${resolved.ids.length} deals (bulk)`,
        meta: { count: resolved.ids.length },
      },
      tx,
    );
  });

  revalidateDealViews();
  return ok({ count: resolved.ids.length });
}

export async function bulkMoveDealsAction(
  target: BulkTarget,
  stageId: string,
): Promise<ActionResult<{ count: number }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const stage = await db.stage.findFirst({ where: { id: stageId, workspaceId: context.workspace.id } });
  if (!stage) return fail("That stage doesn't exist in this workspace.");

  const resolved = await resolveBulkDealIds(context.workspace.id, target);
  if ("error" in resolved) return fail(resolved.error);
  if (resolved.ids.length === 0) return fail("Nothing to move.");

  const nowClosed = stage.isWon || stage.isLost;
  const last = await db.deal.findFirst({
    where: { workspaceId: context.workspace.id, stageId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const basePosition = (last?.position ?? 0) + 1024;

  await db.$transaction(async (tx) => {
    let offset = 0;
    for (const id of resolved.ids) {
      await tx.deal.update({
        where: { id },
        data: {
          stageId,
          position: basePosition + offset,
          ...(nowClosed ? { closedAt: new Date() } : { closedAt: null, lostReason: null }),
        },
      });
      offset += 1024;
    }
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: stage.isWon ? "deal.won" : stage.isLost ? "deal.lost" : "deal.stage_changed",
        entityType: "deal",
        entityLabel: `${resolved.ids.length} deals (bulk)`,
        meta: { count: resolved.ids.length, to: stage.name },
      },
      tx,
    );
  });

  revalidateDealViews();
  return ok({ count: resolved.ids.length });
}
