"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  History,
  LayoutDashboard,
  Settings,
  SquareKanban,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/deals", label: "Deals", icon: SquareKanban, exact: false },
  { href: "/app/contacts", label: "Contacts", icon: Users, exact: false },
  { href: "/app/companies", label: "Companies", icon: Building2, exact: false },
  { href: "/app/activity", label: "Activity", icon: History, exact: false },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-2">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
