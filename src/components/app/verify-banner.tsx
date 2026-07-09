"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";

import { resendVerificationAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function VerifyBanner() {
  const [pending, startTransition] = useTransition();
  const [demoLink, setDemoLink] = useState<string | null>(null);

  function resend() {
    startTransition(async () => {
      const result = await resendVerificationAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data.demoVerifyLink) {
        setDemoLink(result.data.demoVerifyLink);
      } else {
        toast.success("Verification email sent. Check your inbox.");
      }
    });
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
    >
      <MailWarning className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        Verify your email to enable editing — everything is read-only until then.
      </span>
      {demoLink ? (
        <Button size="sm" render={<a href={demoLink} />}>
          Open verification link
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={resend} disabled={pending}>
          {pending ? "Sending…" : "Resend link"}
        </Button>
      )}
    </div>
  );
}
