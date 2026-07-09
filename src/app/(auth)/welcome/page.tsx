import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  if (memberships.length > 0) redirect("/app");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create a workspace</CardTitle>
        <CardDescription>
          You&apos;re not a member of any workspace right now. Create one to get going.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateWorkspaceForm />
      </CardContent>
    </Card>
  );
}
