"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { moveDealAction, restoreDealAction, softDeleteDealAction } from "@/server/actions/deals";
import { DealDialog, type DealFormOptions, type EditableDeal } from "@/components/deals/deal-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export function DealDetailActions({
  deal,
  options,
  currentUserId,
}: {
  deal: EditableDeal;
  options: DealFormOptions;
  currentUserId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await softDeleteDealAction(deal.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast("Deal deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            const restored = await restoreDealAction(deal.id);
            if (restored.ok) toast.success("Deal restored");
            else toast.error(restored.error);
          },
        },
      });
      router.push("/app/deals");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil data-icon="inline-start" aria-hidden="true" />
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" size="sm" disabled={pending} />}
        >
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deal.title}” will be removed from the pipeline. You can undo right after, and the
              activity trail is kept either way.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete deal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DealDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        options={options}
        deal={deal}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export function StageQuickSelect({
  dealId,
  stageId,
  stages,
}: {
  dealId: string;
  stageId: string;
  stages: DealFormOptions["stages"];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const items = stages.map((s) => ({ value: s.id, label: s.name }));

  function handleChange(value: unknown) {
    const nextId = value as string;
    if (!nextId || nextId === stageId) return;
    const target = stages.find((s) => s.id === nextId);
    startTransition(async () => {
      const result = await moveDealAction({
        dealId,
        stageId: nextId,
        prevDealId: null,
        nextDealId: null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (target?.isWon) toast.success("Deal marked as won");
      else if (target?.isLost) toast("Deal marked as lost");
      else toast.success(`Moved to ${target?.name}`);
      router.refresh();
    });
  }

  return (
    <Select value={stageId} onValueChange={handleChange} items={items} disabled={pending}>
      <SelectTrigger className="w-full" aria-label="Change stage">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            <span className={cn("size-2 rounded-full", stageColor(stage.color).dot)} />
            {stage.name}
            <span className="text-xs text-muted-foreground">{stage.probability}%</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
