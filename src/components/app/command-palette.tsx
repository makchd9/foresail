"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Building2,
  History,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  SquareKanban,
  Sun,
  Table2,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

export const OPEN_PALETTE_EVENT = "foresail:open-palette";

/** ⌘K / Ctrl+K everywhere in the app; also opened via the sidebar search button. */
export function CommandPalette({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    };
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Jump anywhere or create records">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {canWrite ? (
          <>
            <CommandGroup heading="Create">
              <CommandItem onSelect={() => run(() => router.push("/app/deals?new=1"))}>
                <Plus aria-hidden="true" />
                New deal
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/app/contacts?new=1"))}>
                <Plus aria-hidden="true" />
                New contact
              </CommandItem>
              <CommandItem onSelect={() => run(() => router.push("/app/companies?new=1"))}>
                <Plus aria-hidden="true" />
                New company
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => run(() => router.push("/app"))}>
            <LayoutDashboard aria-hidden="true" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/deals"))}>
            <SquareKanban aria-hidden="true" />
            Deals board
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/deals?view=table"))}>
            <Table2 aria-hidden="true" />
            Deals table
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/contacts"))}>
            <Users aria-hidden="true" />
            Contacts
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/companies"))}>
            <Building2 aria-hidden="true" />
            Companies
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/activity"))}>
            <History aria-hidden="true" />
            Activity
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/app/settings"))}>
            <Settings aria-hidden="true" />
            Settings
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun aria-hidden="true" />
            Light mode
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon aria-hidden="true" />
            Dark mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
