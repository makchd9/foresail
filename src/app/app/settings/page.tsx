import type { Metadata } from "next";

import { requireWorkspacePage } from "@/server/workspace";
import { isProtectedDemoEmail } from "@/lib/demo";
import { ChangePasswordForm, ProfileNameForm } from "@/components/settings/profile-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profile settings",
};

export default async function ProfileSettingsPage() {
  const context = await requireWorkspacePage();
  const demoAccount = isProtectedDemoEmail(context.user.email);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
          <CardDescription>How you appear to your team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{context.user.email}</p>
            </div>
            <Badge variant={context.user.emailVerified ? "secondary" : "outline"}>
              {context.user.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          {demoAccount ? (
            <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
              This is the shared demo account — its name and password are locked. Sign up for your
              own account to try profile settings.
            </p>
          ) : (
            <ProfileNameForm defaultName={context.user.name} />
          )}
        </CardContent>
      </Card>

      {!demoAccount ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Password</CardTitle>
            <CardDescription>Changing it signs no one out, but new sign-ins need it</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
