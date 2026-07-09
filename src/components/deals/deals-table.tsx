"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Pencil, SquareKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bulkDeleteDealsAction, bulkMoveDealsAction, restoreDealAction, softDeleteDealAction, type BulkTarget } from "@/server/actions/deals";
import type { DealTableRow } from "@/server/queries/deals-table";
import type { ListParams } from "@/lib/list-params";
import { DealDialog, type DealFormOptions, type EditableDeal } from "@/components/deals/deal-dialog";
import { EmptyState } from "@/components/empty-state";
import { SortHeader } from "@/components/data-table/sort-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { daysUntil, formatMoney, formatShortDate } from "@/lib/format";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export function DealsTable({
  rows,
  total,
  options,
  canWrite,
  currentUserId,
  params,
}: {
  rows: DealTableRow[];
  total: number;
  options: DealFormOptions;
  canWrite: boolean;
  currentUserId: string;
  params: ListParams;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [editing, setEditing] = useState<EditableDeal | null>(null);
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pageIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectionCount = allMatching ? total : selected.size;

  function clearSelection() {
    setSelected(new Set());
    setAllMatching(false);
  }

  function togglePage(checked: boolean) {
    setAllMatching(false);
    setSelected(checked ? new Set(pageIds) : new Set());
  }

  function toggleRow(id: string, checked: boolean) {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function bulkTarget(): BulkTarget {
    return allMatching
      ? { mode: "filter", q: params.q, stage: params.stage, owner: params.owner }
      : { mode: "ids", ids: [...selected] };
  }

  function runBulkMove(stageId: string) {
    const stage = options.stages.find((s) => s.id === stageId);
    startTransition(async () => {
      const result = await bulkMoveDealsAction(bulkTarget(), stageId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moved ${result.data.count} deal${result.data.count === 1 ? "" : "s"} to ${stage?.name}`);
      clearSelection();
      router.refresh();
    });
  }

  function runBulkDelete() {
    startTransition(async () => {
      const result = await bulkDeleteDealsAction(bulkTarget());
      setConfirmingBulkDelete(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${result.data.count} deal${result.data.count === 1 ? "" : "s"}`);
      clearSelection();
      router.refresh();
    });
  }

  function deleteSingle(deal: DealTableRow) {
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
            if (restored.ok) {
              toast.success("Deal restored");
              router.refresh();
            } else toast.error(restored.error);
          },
        },
      });
      router.refresh();
    });
  }

  const moveItems = options.stages.map((s) => ({ value: s.id, label: `Move to ${s.name}` }));

  if (rows.length === 0) {
    return (
      <div className="px-4 sm:px-6">
        <EmptyState
          icon={<SquareKanban className="size-6" aria-hidden="true" />}
          title="No deals match"
          description="Try a different search, or clear the filters to see everything."
        >
          <Button variant="outline" onClick={() => router.replace("/app/deals?view=table")}>
            Clear filters
          </Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {selectionCount > 0 ? (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2 sm:mx-6"
        >
          <p className="text-sm font-medium tabular-nums">
            {selectionCount.toLocaleString("en-US")} selected
          </p>
          {allPageSelected && !allMatching && total > rows.length ? (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setAllMatching(true)}>
              Select all {total.toLocaleString("en-US")} matching
            </Button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <Select items={moveItems} value={null} onValueChange={(v) => v && runBulkMove(v as string)}>
              <SelectTrigger size="sm" aria-label="Move selected deals to stage" disabled={pending}>
                <SelectValue placeholder="Move to stage…">Move to stage…</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <span className={cn("size-2 rounded-full", stageColor(stage.color).dot)} />
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => setConfirmingBulkDelete(true)}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto px-4 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              {canWrite ? (
                <TableHead className="w-8">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={(checked) => togglePage(checked === true)}
                    aria-label="Select all deals on this page"
                  />
                </TableHead>
              ) : null}
              <TableHead>
                <SortHeader label="Deal" field="title" params={params} basePath="/app/deals" view="table" />
              </TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">
                <SortHeader
                  label="Value"
                  field="valueCents"
                  params={params}
                  basePath="/app/deals"
                  view="table"
                  defaultDir="desc"
                  align="right"
                />
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Close date</TableHead>
              <TableHead>
                <SortHeader
                  label="Updated"
                  field="updatedAt"
                  params={params}
                  basePath="/app/deals"
                  view="table"
                  defaultDir="desc"
                />
              </TableHead>
              <TableHead className="w-10" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((deal) => {
              const isClosed = deal.stage.isWon || deal.stage.isLost;
              const due = deal.expectedCloseDate ? daysUntil(deal.expectedCloseDate) : null;
              const overdue = !isClosed && due !== null && due < 0;
              const colors = stageColor(deal.stage.color);
              return (
                <TableRow key={deal.id} data-state={selected.has(deal.id) ? "selected" : undefined}>
                  {canWrite ? (
                    <TableCell>
                      <Checkbox
                        checked={allMatching || selected.has(deal.id)}
                        onCheckedChange={(checked) => toggleRow(deal.id, checked === true)}
                        aria-label={`Select ${deal.title}`}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="max-w-64 font-medium">
                    <Link
                      href={`/app/deals/${deal.id}`}
                      className="block truncate rounded-sm underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {deal.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-transparent", colors.badge)}>
                      <span className={cn("size-1.5 rounded-full", colors.dot)} aria-hidden="true" />
                      {deal.stage.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatMoney(deal.valueCents)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{deal.company?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{deal.owner?.name ?? "—"}</TableCell>
                  <TableCell className={cn("tabular-nums", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {deal.expectedCloseDate ? formatShortDate(deal.expectedCloseDate) : "—"}
                    {overdue ? " · overdue" : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatShortDate(deal.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${deal.title}`} />
                        }
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="sr-only">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/app/deals/${deal.id}`)} className="gap-2">
                            <ExternalLink className="size-4" aria-hidden="true" />
                            Open
                          </DropdownMenuItem>
                          {canWrite ? (
                            <DropdownMenuItem onClick={() => setEditing(toEditable(deal))} className="gap-2">
                              <Pencil className="size-4" aria-hidden="true" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuGroup>
                        {canWrite ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteSingle(deal)}
                              className="gap-2"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DealDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        options={options}
        deal={editing}
        currentUserId={currentUserId}
      />
      <AlertDialog open={confirmingBulkDelete} onOpenChange={setConfirmingBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectionCount.toLocaleString("en-US")} deal{selectionCount === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll be soft-deleted and disappear from the pipeline and forecast. The
              activity trail is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBulkDelete} disabled={pending}>
              Delete deals
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function toEditable(deal: DealTableRow): EditableDeal {
  return {
    id: deal.id,
    title: deal.title,
    valueCents: deal.valueCents,
    stageId: deal.stageId,
    companyId: deal.companyId,
    contactId: deal.contactId,
    ownerId: deal.ownerId,
    expectedCloseDate: deal.expectedCloseDate,
    lostReason: deal.lostReason,
  };
}
