import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MailQuestion, Users } from "lucide-react";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hashToken } from "@/server/tokens";
import { ROLE_LABEL, type Role } from "@/lib/rbac";
import { AcceptInviteButton } from "@/components/auth/accept-invite";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Workspace invite",
  description: "Join a Foresail workspace.",
  robots: { index: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?from=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invite = await db.workspaceInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { workspace: { select: { id: true, name: true } } },
  });

  const valid = invite && !invite.revokedAt && invite.expiresAt > new Date();

  if (!valid) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MailQuestion className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">Invite not valid</CardTitle>
          <CardDescription>
            This link has expired or was revoked. Ask a workspace admin for a fresh one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" render={<Link href="/app" />}>
            Back to the app
          </Button>
        </CardContent>
      </Card>
    );
  }

  const existing = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
  });
  if (existing) redirect("/app");

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="size-6" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">Join {invite.workspace.name}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as{" "}
          <span className="font-medium text-foreground">{ROLE_LABEL[invite.role as Role]}</span>.
          You&apos;re signed in as {user.email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteButton token={token} workspaceName={invite.workspace.name} />
      </CardContent>
    </Card>
  );
}
