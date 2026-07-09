"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { DEMO_WORKSPACE_NOTICE } from "@/lib/demo";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { stageSchema } from "@/lib/validators/settings";
import { logActivity } from "@/server/activity";
import { getActionContext } from "@/server/workspace";

function revalidateStageViews() {
  revalidatePath("/app/settings/stages");
  revalidatePath("/app/deals");
  revalidatePath("/app");
}

export async function updateStageAction(
  stageId: string,
  input: { name: string; probability: number; color: string },
): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const stage = await db.stage.findFirst({
    where: { id: stageId, workspaceId: context.workspace.id },
  });
  if (!stage) return fail("That stage no longer exists.");

  // Won/Lost keep their fixed probabilities — the forecast depends on them.
  const probability = stage.isWon ? 100 : stage.isLost ? 0 : parsed.data.probability;

  await db.$transaction(async (tx) => {
    await tx.stage.update({
      where: { id: stage.id },
      data: { name: parsed.data.name, probability, color: parsed.data.color },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "stage.updated",
        entityType: "stage",
        entityId: stage.id,
        entityLabel: parsed.data.name,
        meta: { probability },
      },
      tx,
    );
  });

  revalidateStageViews();
  return ok(null);
}

export async function createStageAction(
  input: { name: string; probability: number; color: string },
): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);

  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const stages = await db.stage.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { order: "asc" },
  });
  if (stages.filter((s) => !s.isWon && !s.isLost).length >= 8) {
    return fail("Eight open stages is the limit — merge before adding more.");
  }

  // Insert before the closed (won/lost) stages.
  const closedStart = stages.find((s) => s.isWon || s.isLost)?.order ?? stages.length;

  await db.$transaction(async (tx) => {
    await tx.stage.updateMany({
      where: { workspaceId: context.workspace.id, order: { gte: closedStart } },
      data: { order: { increment: 1 } },
    });
    const created = await tx.stage.create({
      data: {
        workspaceId: context.workspace.id,
        name: parsed.data.name,
        probability: parsed.data.probability,
        color: parsed.data.color,
        order: closedStart,
      },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "stage.updated",
        entityType: "stage",
        entityId: created.id,
        entityLabel: `${created.name} (new)`,
      },
      tx,
    );
  });

  revalidateStageViews();
  return ok(null);
}

export async function deleteStageAction(stageId: string): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);

  const stage = await db.stage.findFirst({
    where: { id: stageId, workspaceId: context.workspace.id },
    include: { _count: { select: { deals: { where: { deletedAt: null } } } } },
  });
  if (!stage) return fail("That stage no longer exists.");
  if (stage.isWon || stage.isLost) return fail("Won and Lost are structural — they can't be deleted.");
  if (stage._count.deals > 0) {
    return fail(`Move its ${stage._count.deals} deal${stage._count.deals === 1 ? "" : "s"} to another stage first.`);
  }

  await db.$transaction(async (tx) => {
    await tx.stage.delete({ where: { id: stage.id } });
    await tx.stage.updateMany({
      where: { workspaceId: context.workspace.id, order: { gt: stage.order } },
      data: { order: { decrement: 1 } },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "stage.updated",
        entityType: "stage",
        entityId: stage.id,
        entityLabel: `${stage.name} (deleted)`,
      },
      tx,
    );
  });

  revalidateStageViews();
  return ok(null);
}

export async function moveStageAction(stageId: string, direction: "up" | "down"): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);

  const stages = await db.stage.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { order: "asc" },
  });
  const open = stages.filter((s) => !s.isWon && !s.isLost);
  const index = open.findIndex((s) => s.id === stageId);
  if (index === -1) return fail("Only open stages can be reordered.");

  const swapWith = direction === "up" ? open[index - 1] : open[index + 1];
  const stage = open[index];
  if (!swapWith || !stage) return fail("It's already at the edge.");

  await db.$transaction([
    db.stage.update({ where: { id: stage.id }, data: { order: swapWith.order } }),
    db.stage.update({ where: { id: swapWith.id }, data: { order: stage.order } }),
  ]);

  revalidateStageViews();
  return ok(null);
}
