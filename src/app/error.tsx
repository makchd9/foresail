"use client";

import { useEffect } from "react";
import { CloudAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Full details go to the server logs; the user sees a way forward.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CloudAlert className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Something broke on our side</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The error has been logged{error.digest ? ` (ref ${error.digest})` : ""}. Try again — if it
          keeps happening, refresh the page.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
