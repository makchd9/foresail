import { AppShell } from "@/components/app/app-shell";
import type { Role } from "@/lib/rbac";
import { getUserMemberships, requireWorkspacePage } from "@/server/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspacePage();
  const memberships = await getUserMemberships(context.user.id);

  return (
    <AppShell
      user={{
        name: context.user.name,
        email: context.user.email,
        emailVerified: Boolean(context.user.emailVerified),
      }}
      workspaces={memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        isDemo: m.workspace.isDemo,
        role: m.role as Role,
      }))}
      activeWorkspaceId={context.workspace.id}
      canWrite={context.canWrite}
    >
      {children}
    </AppShell>
  );
}
