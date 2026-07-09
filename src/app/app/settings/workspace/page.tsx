import type { Metadata } from "next";

import { requireWorkspacePage } from "@/server/workspace";
import { hasRole } from "@/lib/rbac";
import { DEMO_WORKSPACE_NOTICE } from "@/lib/demo";
import { DeleteWorkspaceCard, WorkspaceSettingsForm } from "@/components/settings/workspace-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Workspace settings",
};

export default async function WorkspaceSettingsPage() {
  const context = await requireWorkspacePage();
  const isAdmin = hasRole(context.role, "ADMIN");
  const isOwner = hasRole(context.role, "OWNER");
  const locked = context.workspace.isDemo;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Workspace</CardTitle>
          <CardDescription>Name and currency</CardDescription>
        </CardHeader>
        <CardContent>
          {locked ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {DEMO_WORKSPACE_NOTICE}
            </p>
          ) : isAdmin ? (
            <WorkspaceSettingsForm
              defaultName={context.workspace.name}
              defaultCurrency={context.workspace.currency}
            />
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Only admins can change workspace settings. You&apos;re a{" "}
              {context.role.toLowerCase()} here.
            </p>
          )}
        </CardContent>
      </Card>

      {isOwner && !locked ? <DeleteWorkspaceCard workspaceName={context.workspace.name} /> : null}
      {!isOwner && !locked ? (
        <p className="px-1 text-xs text-muted-foreground">
          Deleting the workspace is reserved for its owner.
        </p>
      ) : null}
    </div>
  );
}
