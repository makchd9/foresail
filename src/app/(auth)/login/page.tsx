import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Foresail workspace to manage your pipeline and forecast.",
};

function safeFrom(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm from={safeFrom(from)} />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        New to Foresail?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Just looking around?</p>
        <p>
          Use the demo login: <span className="font-mono">demo@foresail.app</span> /{" "}
          <span className="font-mono">demo1234</span>
        </p>
      </div>
    </div>
  );
}
