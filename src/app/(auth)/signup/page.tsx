import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Set up a Foresail workspace in under a minute: kanban pipeline, weighted forecasting, and a team-ready CRM.",
};

export default function SignupPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your workspace</CardTitle>
          <CardDescription>Track deals and forecast revenue in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
