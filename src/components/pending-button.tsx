"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PendingButtonProps = React.ComponentProps<typeof Button> & {
  pending?: boolean;
  pendingText?: string;
};

/**
 * Submit button with an explicit pending state: disabled + spinner while the
 * action runs, so double-submits are structurally impossible.
 */
export function PendingButton({
  pending = false,
  pendingText,
  children,
  disabled,
  className,
  ...props
}: PendingButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(className)}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
