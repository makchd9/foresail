"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { companyFormSchema } from "@/lib/validators/contact";
import { logActivity } from "@/server/activity";
import { getActionContext } from "@/server/workspace";

export async function createCompanyAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = companyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const company = await db.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: { workspaceId: context.workspace.id, ...parsed.data },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "company.created",
        entityType: "company",
        entityId: created.id,
        entityLabel: created.name,
      },
      tx,
    );
    return created;
  });

  revalidatePath("/app/companies");
  return ok({ id: company.id });
}

export async function updateCompanyAction(
  companyId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = companyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await db.company.findFirst({
    where: { id: companyId, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!existing) return fail("This company no longer exists.");

  await db.$transaction(async (tx) => {
    const updated = await tx.company.update({ where: { id: companyId }, data: parsed.data });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "company.updated",
        entityType: "company",
        entityId: updated.id,
        entityLabel: updated.name,
      },
      tx,
    );
  });

  revalidatePath("/app/companies");
  return ok({ id: companyId });
}

export async function deleteCompanyAction(companyId: string): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const company = await db.company.findFirst({
    where: { id: companyId, workspaceId: context.workspace.id },
    select: { id: true, name: true },
  });
  if (!company) return fail("This company no longer exists.");

  // Contacts and deals keep existing via ON DELETE SET NULL.
  await db.$transaction(async (tx) => {
    await tx.company.delete({ where: { id: company.id } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "company.deleted",
        entityType: "company",
        entityId: company.id,
        entityLabel: company.name,
      },
      tx,
    );
  });

  revalidatePath("/app/companies");
  revalidatePath("/app/contacts");
  revalidatePath("/app/deals");
  return ok(null);
}
