"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

import {
  ACTIVE_WORKSPACE_COOKIE,
  createWorkspaceForUser,
} from "@/server/workspace";

const workspaceNameSchema = z.object({
  name: z.string("Workspace name is required").trim().min(1, "Workspace name is required").max(60, "Keep it under 60 characters"),
});

async function setWorkspaceCookie(workspaceId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Used from /welcome when a user has no workspace (e.g. removed from all of them). */
export async function createWorkspaceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");

  const parsed = workspaceNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const workspace = await createWorkspaceForUser(user.id, parsed.data.name);
  await setWorkspaceCookie(workspace.id);
  revalidatePath("/app");
  return ok(null);
}

/** Switch the active workspace (validates membership server-side). */
export async function switchWorkspaceAction(workspaceId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");

  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    select: { workspaceId: true },
  });
  if (!membership) return fail("You're not a member of that workspace.");

  await setWorkspaceCookie(workspaceId);
  revalidatePath("/app");
  return ok(null);
}

// ---------- Workspace settings ----------

export async function updateWorkspaceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { getActionContext } = await import("@/server/workspace");
  const { workspaceSettingsSchema } = await import("@/lib/validators/settings");
  const { DEMO_WORKSPACE_NOTICE } = await import("@/lib/demo");
  const { logActivity } = await import("@/server/activity");

  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);

  const parsed = workspaceSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  await db.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: context.workspace.id },
      data: { name: parsed.data.name, currency: parsed.data.currency },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "workspace.updated",
        entityType: "workspace",
        entityId: context.workspace.id,
        entityLabel: parsed.data.name,
      },
      tx,
    );
  });

  revalidatePath("/app", "layout");
  return ok(null);
}

export async function deleteWorkspaceAction(confirmName: string): Promise<ActionResult> {
  const { getActionContext } = await import("@/server/workspace");
  const { DEMO_WORKSPACE_NOTICE } = await import("@/lib/demo");

  const context = await getActionContext("OWNER");
  if (!context.ok) return fail(context.error);
  if (context.workspace.isDemo) return fail(DEMO_WORKSPACE_NOTICE);
  if (confirmName.trim() !== context.workspace.name) {
    return fail("Type the workspace name exactly to confirm.");
  }

  await db.workspace.delete({ where: { id: context.workspace.id } });

  const store = await cookies();
  store.delete(ACTIVE_WORKSPACE_COOKIE);
  revalidatePath("/app", "layout");
  return ok(null);
}
