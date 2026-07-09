"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { contactFormSchema } from "@/lib/validators/contact";
import { logActivity } from "@/server/activity";
import { getActionContext } from "@/server/workspace";

async function validateCompany(workspaceId: string, companyId: string | null): Promise<string | null> {
  if (!companyId) return null;
  const company = await db.company.findFirst({ where: { id: companyId, workspaceId }, select: { id: true } });
  return company ? null : "That company doesn't exist in this workspace.";
}

export async function createContactAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const companyError = await validateCompany(context.workspace.id, parsed.data.companyId);
  if (companyError) return fail(companyError);

  const contact = await db.$transaction(async (tx) => {
    const created = await tx.contact.create({
      data: { workspaceId: context.workspace.id, ...parsed.data },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "contact.created",
        entityType: "contact",
        entityId: created.id,
        entityLabel: created.name,
      },
      tx,
    );
    return created;
  });

  revalidatePath("/app/contacts");
  return ok({ id: contact.id });
}

export async function updateContactAction(
  contactId: string,
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const existing = await db.contact.findFirst({
    where: { id: contactId, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!existing) return fail("This contact no longer exists.");

  const companyError = await validateCompany(context.workspace.id, parsed.data.companyId);
  if (companyError) return fail(companyError);

  await db.$transaction(async (tx) => {
    const updated = await tx.contact.update({ where: { id: contactId }, data: parsed.data });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "contact.updated",
        entityType: "contact",
        entityId: updated.id,
        entityLabel: updated.name,
      },
      tx,
    );
  });

  revalidatePath("/app/contacts");
  return ok({ id: contactId });
}

export async function deleteContactAction(contactId: string): Promise<ActionResult> {
  const context = await getActionContext("MEMBER");
  if (!context.ok) return fail(context.error);

  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: context.workspace.id },
    select: { id: true, name: true },
  });
  if (!contact) return fail("This contact no longer exists.");

  await db.$transaction(async (tx) => {
    await tx.contact.delete({ where: { id: contact.id } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "contact.deleted",
        entityType: "contact",
        entityId: contact.id,
        entityLabel: contact.name,
      },
      tx,
    );
  });

  revalidatePath("/app/contacts");
  revalidatePath("/app/deals");
  return ok(null);
}
