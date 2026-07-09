import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Foresail account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Reset links are single-use and expire after 30 minutes</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This page needs a reset link. Request one and open the link from your email.
            </p>
            <Button variant="outline" className="w-full" render={<Link href="/forgot-password" />}>
              Request a reset link
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
