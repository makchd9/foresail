"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { acceptInviteAction } from "@/server/actions/members";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token, workspaceName }: { token: string; workspaceName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function accept() {
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Welcome to ${result.data.workspaceName}`);
      router.push("/app");
      router.refresh();
    });
  }

  return (
    <Button onClick={accept} disabled={pending} className="w-full">
      {pending ? "Joining…" : `Join ${workspaceName}`}
    </Button>
  );
}
