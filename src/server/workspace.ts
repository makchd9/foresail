import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { DEFAULT_STAGES } from "@/lib/stages";
import { hasRole, ROLE_RANK, type Role } from "@/lib/rbac";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

export const ACTIVE_WORKSPACE_COOKIE = "fs_ws";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  isDemo: boolean;
};

export type ActiveMembership = {
  role: Role;
  workspace: WorkspaceSummary;
};

const workspaceSelect = { id: true, name: true, slug: true, currency: true, isDemo: true } as const;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 32);
  return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

/** Create a workspace with the default pipeline and make `userId` its owner. */
export async function createWorkspaceForUser(userId: string, name: string) {
  return db.workspace.create({
    data: {
      name,
      slug: slugify(name),
      memberships: { create: { userId, role: "OWNER" } },
      stages: {
        create: DEFAULT_STAGES.map((s, i) => ({
          name: s.name,
          order: i,
          probability: s.probability,
          color: s.color,
          isWon: s.isWon,
          isLost: s.isLost,
        })),
      },
    },
    select: workspaceSelect,
  });
}

/** All memberships for the signed-in user (for the workspace switcher). */
export const getUserMemberships = cache(async (userId: string) => {
  return db.membership.findMany({
    where: { userId },
    select: { role: true, workspace: { select: workspaceSelect } },
    orderBy: { createdAt: "asc" },
  });
});

/**
 * Resolve the active workspace: the one in the cookie if the user is still a
 * member of it, otherwise their first workspace. Never trusts the cookie alone.
 */
export const getActiveMembership = cache(async (userId: string): Promise<ActiveMembership | null> => {
  const memberships = await getUserMemberships(userId);
  const first = memberships[0];
  if (!first) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const match = preferred ? memberships.find((m) => m.workspace.id === preferred) : undefined;
  const chosen = match ?? first;
  return { role: chosen.role as Role, workspace: chosen.workspace };
});

export type PageContext = {
  user: CurrentUser;
  role: Role;
  workspace: WorkspaceSummary;
  canWrite: boolean;
};

/** For pages under /app: requires a session and at least one workspace. */
export async function requireWorkspacePage(): Promise<PageContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await getActiveMembership(user.id);
  if (!membership) redirect("/welcome");
  return {
    user,
    role: membership.role,
    workspace: membership.workspace,
    canWrite: hasRole(membership.role, "MEMBER") && Boolean(user.emailVerified),
  };
}

export type ActionContext =
  | { ok: true; user: CurrentUser; role: Role; workspace: WorkspaceSummary }
  | { ok: false; error: string };

/**
 * For server actions: authenticate, resolve the active workspace, and enforce
 * a minimum role. Mutating roles (MEMBER+) additionally require a verified email.
 */
export async function getActionContext(
  minimumRole: Role = "MEMBER",
  { requireVerified = ROLE_RANK[minimumRole] >= ROLE_RANK.MEMBER }: { requireVerified?: boolean } = {},
): Promise<ActionContext> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };

  const membership = await getActiveMembership(user.id);
  if (!membership) return { ok: false, error: "You don't have an active workspace." };

  if (!hasRole(membership.role, minimumRole)) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  if (requireVerified && !user.emailVerified) {
    return { ok: false, error: "Verify your email to make changes." };
  }
  return { ok: true, user, role: membership.role, workspace: membership.workspace };
}
