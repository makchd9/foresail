"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { DEMO_WORKSPACE_NOTICE } from "@/lib/demo";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { ASSIGNABLE_ROLES, type Role } from "@/lib/rbac";
import { inviteRoleSchema } from "@/lib/validators/settings";
import { appUrl } from "@/lib/urls";
import { logActivity } from "@/server/activity";
import { generateToken, hashToken } from "@/server/tokens";
import { ACTIVE_WORKSPACE_COOKIE, getActionContext } from "@/server/workspace";

function guardDemo(isDemo: boolean): string | null {
  return isDemo ? DEMO_WORKSPACE_NOTICE : null;
}

export async function changeMemberRoleAction(
  membershipId: string,
  role: Role,
): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  const demoBlock = guardDemo(context.workspace.isDemo);
  if (demoBlock) return fail(demoBlock);

  if (!ASSIGNABLE_ROLES.includes(role)) return fail("That role can't be assigned.");

  const membership = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: context.workspace.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!membership) return fail("That member no longer exists.");
  if (membership.role === "OWNER") return fail("The owner's role can't be changed.");
  if (membership.userId === context.user.id) return fail("You can't change your own role.");

  await db.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: membership.id }, data: { role } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "member.role_changed",
        entityType: "member",
        entityId: membership.userId,
        entityLabel: membership.user.name,
        meta: { role },
      },
      tx,
    );
  });

  revalidatePath("/app/settings/members");
  return ok(null);
}

export async function removeMemberAction(membershipId: string): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  const demoBlock = guardDemo(context.workspace.isDemo);
  if (demoBlock) return fail(demoBlock);

  const membership = await db.membership.findFirst({
    where: { id: membershipId, workspaceId: context.workspace.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!membership) return fail("That member no longer exists.");
  if (membership.role === "OWNER") return fail("The owner can't be removed.");
  if (membership.userId === context.user.id) {
    return fail("Use “Leave workspace” to remove yourself.");
  }

  await db.$transaction(async (tx) => {
    await tx.membership.delete({ where: { id: membership.id } });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "member.removed",
        entityType: "member",
        entityId: membership.userId,
        entityLabel: membership.user.name,
      },
      tx,
    );
  });

  revalidatePath("/app/settings/members");
  return ok(null);
}

export async function leaveWorkspaceAction(): Promise<ActionResult> {
  const context = await getActionContext("VIEWER", { requireVerified: false });
  if (!context.ok) return fail(context.error);
  if (context.role === "OWNER") {
    return fail("Owners can't leave their workspace. Delete it instead, or transfer it first.");
  }
  if (context.workspace.isDemo) {
    return fail("You can't leave the shared demo workspace — it's everyone's tour.");
  }

  const membership = await db.membership.findFirst({
    where: { workspaceId: context.workspace.id, userId: context.user.id },
  });
  if (!membership) return fail("You're not a member of this workspace.");

  await db.membership.delete({ where: { id: membership.id } });
  const store = await cookies();
  store.delete(ACTIVE_WORKSPACE_COOKIE);
  revalidatePath("/app", "layout");
  return ok(null);
}

// ---------- Invite links ----------

export type CreateInviteResult = { url: string; role: Role; expiresAt: string };

export async function createInviteAction(roleInput: string): Promise<ActionResult<CreateInviteResult>> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  const demoBlock = guardDemo(context.workspace.isDemo);
  if (demoBlock) return fail(demoBlock);

  const parsedRole = inviteRoleSchema.safeParse(roleInput);
  if (!parsedRole.success) return fail("Pick a valid role for the invite.");

  const { raw, hash: tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await tx.workspaceInvite.create({
      data: {
        workspaceId: context.workspace.id,
        role: parsedRole.data,
        tokenHash,
        createdById: context.user.id,
        expiresAt,
      },
    });
    await logActivity(
      {
        workspaceId: context.workspace.id,
        actorId: context.user.id,
        action: "member.invited",
        entityType: "member",
        entityLabel: context.workspace.name,
        meta: { role: parsedRole.data },
      },
      tx,
    );
  });

  revalidatePath("/app/settings/members");
  return ok({
    url: appUrl(`/invite/${raw}`),
    role: parsedRole.data,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function revokeInviteAction(inviteId: string): Promise<ActionResult> {
  const context = await getActionContext("ADMIN");
  if (!context.ok) return fail(context.error);
  const demoBlock = guardDemo(context.workspace.isDemo);
  if (demoBlock) return fail(demoBlock);

  const invite = await db.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId: context.workspace.id, revokedAt: null },
  });
  if (!invite) return fail("That invite is already gone.");

  await db.workspaceInvite.update({ where: { id: invite.id }, data: { revokedAt: new Date() } });
  revalidatePath("/app/settings/members");
  return ok(null);
}

export async function acceptInviteAction(rawToken: string): Promise<ActionResult<{ workspaceName: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first, then open the invite link again.");

  const invite = await db.workspaceInvite.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { workspace: { select: { id: true, name: true } } },
  });
  if (!invite || invite.revokedAt || invite.expiresAt < new Date()) {
    return fail("This invite link is invalid or has expired. Ask for a fresh one.");
  }

  const existing = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
  });
  if (!existing) {
    await db.$transaction(async (tx) => {
      await tx.membership.create({
        data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
      });
      await logActivity(
        {
          workspaceId: invite.workspaceId,
          actorId: user.id,
          action: "member.joined",
          entityType: "member",
          entityId: user.id,
          entityLabel: invite.workspace.name,
          meta: { role: invite.role },
        },
        tx,
      );
    });
  }

  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, invite.workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/app", "layout");
  return ok({ workspaceName: invite.workspace.name });
}
