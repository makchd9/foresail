"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, SquareKanban } from "lucide-react";
import { toast } from "sonner";

import { loadSampleDataAction } from "@/server/actions/deals";
import { DealDialog, type DealFormOptions } from "@/components/deals/deal-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** First-run experience: create the first deal, or seed obviously-sample data. */
export function EmptyWorkspace({
  options,
  canWrite,
  currentUserId,
}: {
  options: DealFormOptions;
  canWrite: boolean;
  currentUserId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function loadSample() {
    startTransition(async () => {
      const result = await loadSampleDataAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Sample data loaded — explore away");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
      <EmptyState
        icon={<SquareKanban className="size-6" aria-hidden="true" />}
        title="Your pipeline is empty"
        description={
          canWrite
            ? "Create your first deal, or load a small set of sample data to see how the board and forecast work."
            : "Nothing here yet. Ask a workspace member to add the first deal."
        }
        className="w-full max-w-xl"
      >
        {canWrite ? (
          <>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create your first deal
            </Button>
            <Button variant="outline" onClick={loadSample} disabled={pending}>
              <Sparkles data-icon="inline-start" aria-hidden="true" />
              {pending ? "Loading…" : "Load sample data"}
            </Button>
          </>
        ) : null}
      </EmptyState>
      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        options={options}
        currentUserId={currentUserId}
      />
    </div>
  );
}
