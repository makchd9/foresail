import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailQuestion, TimerOff } from "lucide-react";

import { verifyEmailToken, type VerifyEmailStatus } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to unlock editing in Foresail.",
};

const CONTENT: Record<
  VerifyEmailStatus,
  { icon: React.ReactNode; title: string; body: string; cta: string }
> = {
  verified: {
    icon: <CheckCircle2 className="size-6" aria-hidden="true" />,
    title: "Email verified",
    body: "You're all set — editing is unlocked across your workspace.",
    cta: "Go to dashboard",
  },
  already: {
    icon: <CheckCircle2 className="size-6" aria-hidden="true" />,
    title: "Already verified",
    body: "This email address was verified earlier. You're good to go.",
    cta: "Go to dashboard",
  },
  expired: {
    icon: <TimerOff className="size-6" aria-hidden="true" />,
    title: "Link expired",
    body: "Verification links last 24 hours. Request a fresh one from the banner in the app.",
    cta: "Open the app",
  },
  invalid: {
    icon: <MailQuestion className="size-6" aria-hidden="true" />,
    title: "Link not recognized",
    body: "This verification link is invalid or was already used. Request a fresh one from the banner in the app.",
    cta: "Open the app",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription>
            We sent you a verification link. Open it to unlock editing.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" className="w-full" render={<Link href="/app" />}>
            Continue to the app
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = await verifyEmailToken(token);
  const content = CONTENT[status];

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {content.icon}
        </div>
        <CardTitle className="text-xl">{content.title}</CardTitle>
        <CardDescription>{content.body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" render={<Link href="/app" />}>
          {content.cta}
        </Button>
      </CardContent>
    </Card>
  );
}
