"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { switchWorkspaceAction } from "@/server/actions/workspace";
import { LogoMark } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export type WorkspaceOption = {
  id: string;
  name: string;
  isDemo: boolean;
  role: Role;
};

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  function selectWorkspace(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      const result = await switchWorkspaceAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none transition-colors",
          "hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
          pending && "opacity-60",
        )}
        aria-label="Switch workspace"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LogoMark className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{active?.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {active ? ROLE_LABEL[active.role] : ""}
            {active?.isDemo ? " · Shared demo" : ""}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => selectWorkspace(workspace.id)}
              className="gap-2"
            >
              <Check
                className={cn("size-4", workspace.id === activeId ? "opacity-100" : "opacity-0")}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                {ROLE_LABEL[workspace.role]}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/welcome")} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
