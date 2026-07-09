import Link from "next/link";
import { Compass } from "lucide-react";

import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo className="text-lg" />
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Off the charts</h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          This page doesn&apos;t exist — maybe the link is old, or the wind took it. Error 404.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Go home
        </Link>
        <Link href="/app" className={cn(buttonVariants())}>
          Open the app
        </Link>
      </div>
    </div>
  );
}
