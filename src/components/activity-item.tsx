import {
  ArrowRight,
  Building2,
  CircleCheck,
  CircleX,
  FilePenLine,
  MessageSquare,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { activityPhrase, type ActivityMeta } from "@/lib/activity";
import { initials, relativeDays } from "@/lib/format";

export type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityLabel: string;
  meta: unknown;
  createdAt: Date;
  actor: { name: string } | null;
};

function actionIcon(action: string) {
  if (action.endsWith(".won")) return <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  if (action.endsWith(".lost")) return <CircleX className="size-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
  if (action.endsWith(".deleted") || action.endsWith(".removed")) return <Trash2 className="size-3.5" aria-hidden="true" />;
  if (action.endsWith(".restored")) return <RotateCcw className="size-3.5" aria-hidden="true" />;
  if (action === "deal.stage_changed") return <ArrowRight className="size-3.5" aria-hidden="true" />;
  if (action === "note.created") return <MessageSquare className="size-3.5" aria-hidden="true" />;
  if (action.startsWith("company.")) return <Building2 className="size-3.5" aria-hidden="true" />;
  if (action.startsWith("contact.")) return <Users className="size-3.5" aria-hidden="true" />;
  if (action.startsWith("member.")) return <UserPlus className="size-3.5" aria-hidden="true" />;
  if (action.startsWith("stage.") || action.startsWith("workspace.")) return <Settings2 className="size-3.5" aria-hidden="true" />;
  if (action.endsWith(".created")) return <Plus className="size-3.5" aria-hidden="true" />;
  return <FilePenLine className="size-3.5" aria-hidden="true" />;
}

export function ActivityItem({
  row,
  showEntityLabel = true,
}: {
  row: ActivityRow;
  showEntityLabel?: boolean;
}) {
  const actorName = row.actor?.name ?? "Someone";
  const phrase = activityPhrase(row.action, row.meta as ActivityMeta);

  return (
    <li className="flex items-start gap-3 py-2.5">
      <Avatar className="mt-0.5 size-6">
        <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
          {initials(actorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <p className="text-foreground">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-muted-foreground">{phrase}</span>
          {showEntityLabel ? <span className="font-medium"> {row.entityLabel}</span> : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {actionIcon(row.action)}
          {relativeDays(row.createdAt)}
        </p>
      </div>
    </li>
  );
}
