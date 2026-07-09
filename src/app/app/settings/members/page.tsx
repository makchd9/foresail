import type { Metadata } from "next";

import { db } from "@/lib/db";
import { requireWorkspacePage } from "@/server/workspace";
import { hasRole, type Role } from "@/lib/rbac";
import { MembersPanel } from "@/components/settings/members-panel";

export const metadata: Metadata = {
  title: "Members",
};

export default async function MembersSettingsPage() {
  const context = await requireWorkspacePage();

  const [memberships, invites] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.workspaceInvite.findMany({
      where: {
        workspaceId: context.workspace.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  return (
    <MembersPanel
      members={memberships.map((m) => ({
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role as Role,
        joinedAt: m.createdAt,
      }))}
      invites={invites.map((i) => ({
        id: i.id,
        role: i.role as Role,
        createdByName: i.createdBy?.name ?? null,
        expiresAt: i.expiresAt,
      }))}
      canManage={hasRole(context.role, "ADMIN")}
      isDemoWorkspace={context.workspace.isDemo}
      currentUserId={context.user.id}
      currentRole={context.role}
    />
  );
}
