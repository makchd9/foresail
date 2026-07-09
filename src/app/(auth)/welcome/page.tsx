import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/session";
import { getUserMemberships } from "@/server/workspace";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create a workspace",
  description: "Set up a workspace to start tracking your pipeline in Foresail.",
};

export default async function WelcomePage() {
  const user = await requireUser();
  const memberships = await getUserMemberships(user.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create a workspace</CardTitle>
          <CardDescription>
            {memberships.length > 0
              ? "Spin up another workspace with its own pipeline and members."
              : "You're not a member of any workspace right now. Create one to get going."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
      {memberships.length > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/app" className="font-medium text-foreground underline-offset-4 hover:underline">
            ← Back to the app
          </Link>
        </p>
      ) : null}
    </div>
  );
}
