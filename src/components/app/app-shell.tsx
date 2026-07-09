"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";

import { Logo } from "@/components/logo";
import { CommandPalette, OPEN_PALETTE_EVENT } from "@/components/app/command-palette";
import { NavLinks } from "@/components/app/nav-links";
import { UserMenu } from "@/components/app/user-menu";
import { VerifyBanner } from "@/components/app/verify-banner";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/app/workspace-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type AppShellProps = {
  children: React.ReactNode;
  user: { name: string; email: string; emailVerified: boolean };
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
  canWrite: boolean;
};

function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      className="mx-2 flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Search className="size-3.5" aria-hidden="true" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="pointer-events-none rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  );
}

export function AppShell({
  children,
  user,
  workspaces,
  activeWorkspaceId,
  canWrite,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarInner = (
    <>
      <div className="px-2 pt-2">
        <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
      </div>
      <div className="py-3">
        <SearchButton />
      </div>
      <NavLinks onNavigate={() => setMobileOpen(false)} />
      <div className="mt-auto border-t p-2">
        <UserMenu name={user.name} email={user.email} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      <CommandPalette canWrite={canWrite} />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        {sidebarInner}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open navigation" />
              }
            >
              <Menu className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col pt-4">{sidebarInner}</div>
            </SheetContent>
          </Sheet>
          <Link href="/app" className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <Logo />
          </Link>
        </header>

        {!user.emailVerified ? <VerifyBanner /> : null}

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
