"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { moveDealAction, restoreDealAction, softDeleteDealAction } from "@/server/actions/deals";
import type { BoardDeal, BoardStage } from "@/server/queries/board";
import { DealDialog, type DealFormOptions, type EditableDeal } from "@/components/deals/deal-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysUntil, formatCompactMoney, formatShortDate, initials } from "@/lib/format";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

type ColumnsMap = Record<string, BoardDeal[]>;

function buildColumns(stages: BoardStage[], deals: BoardDeal[]): ColumnsMap {
  const map: ColumnsMap = Object.fromEntries(stages.map((s) => [s.id, []]));
  for (const deal of deals) {
    map[deal.stageId]?.push(deal);
  }
  return map;
}

function toEditableDeal(deal: BoardDeal): EditableDeal {
  return {
    id: deal.id,
    title: deal.title,
    valueCents: deal.valueCents,
    stageId: deal.stageId,
    companyId: deal.company?.id ?? null,
    contactId: deal.contactId,
    ownerId: deal.owner?.id ?? null,
    expectedCloseDate: deal.expectedCloseDate,
    lostReason: deal.lostReason,
  };
}

export function DealsBoard({
  stages,
  deals,
  options,
  canWrite,
  currentUserId,
  openNewOnMount,
}: {
  stages: BoardStage[];
  deals: BoardDeal[];
  options: DealFormOptions;
  canWrite: boolean;
  currentUserId: string;
  openNewOnMount: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [columns, setColumns] = useState<ColumnsMap>(() => buildColumns(stages, deals));
  const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<EditableDeal | null>(null);
  const [newStageId, setNewStageId] = useState<string | undefined>(undefined);
  const [, startTransition] = useTransition();
  const snapshotRef = useRef<ColumnsMap | null>(null);
  const originRef = useRef<{ stageId: string; index: number } | null>(null);

  // Reconcile with fresh server data after router.refresh().
  useEffect(() => {
    setColumns(buildColumns(stages, deals));
  }, [stages, deals]);

  // ?new=1 opens the create dialog (used by the command palette).
  useEffect(() => {
    if (openNewOnMount && canWrite) {
      setDialogOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(`/app/deals${params.size ? `?${params}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findContainer(id: UniqueIdentifier): string | null {
    const key = String(id);
    if (columns[key]) return key;
    for (const [stageId, items] of Object.entries(columns)) {
      if (items.some((d) => d.id === key)) return stageId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const container = findContainer(event.active.id);
    if (!container) return;
    const items = columns[container]!;
    const index = items.findIndex((d) => d.id === event.active.id);
    snapshotRef.current = columns;
    originRef.current = { stageId: container, index };
    setActiveDeal(items[index] ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer] ?? [];
      const overItems = prev[overContainer] ?? [];
      const activeIndex = activeItems.findIndex((d) => d.id === active.id);
      const deal = activeItems[activeIndex];
      if (!deal) return prev;

      let overIndex: number;
      if (prev[String(over.id)]) {
        overIndex = overItems.length;
      } else {
        const index = overItems.findIndex((d) => d.id === over.id);
        const activeTop = active.rect.current.translated?.top;
        const isBelow =
          index >= 0 && activeTop !== undefined && over.rect
            ? activeTop > over.rect.top + over.rect.height / 2
            : false;
        overIndex = index >= 0 ? index + (isBelow ? 1 : 0) : overItems.length;
      }

      return {
        ...prev,
        [activeContainer]: activeItems.filter((d) => d.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, overIndex),
          { ...deal, stageId: overContainer },
          ...overItems.slice(overIndex),
        ],
      };
    });
  }

  function commitMove(dealId: string, targetStageId: string, nextColumns: ColumnsMap) {
    const snapshot = snapshotRef.current;
    const items = nextColumns[targetStageId] ?? [];
    const index = items.findIndex((d) => d.id === dealId);
    const prevDealId = items[index - 1]?.id ?? null;
    const nextDealId = items[index + 1]?.id ?? null;
    const targetStage = stages.find((s) => s.id === targetStageId);

    startTransition(async () => {
      const result = await moveDealAction({ dealId, stageId: targetStageId, prevDealId, nextDealId });
      if (!result.ok) {
        if (snapshot) setColumns(snapshot);
        toast.error(result.error);
        return;
      }
      if (targetStage?.isWon) toast.success("Deal marked as won");
      else if (targetStage?.isLost) toast("Deal marked as lost");
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);
    const origin = originRef.current;
    const activeContainer = findContainer(active.id);
    if (!activeContainer || !origin) return;

    let next = columns;
    if (over && String(over.id) !== String(active.id)) {
      const overContainer = findContainer(over.id);
      if (overContainer === activeContainer) {
        const items = columns[activeContainer] ?? [];
        const oldIndex = items.findIndex((d) => d.id === active.id);
        const newIndex = items.findIndex((d) => d.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          next = {
            ...columns,
            [activeContainer]: arrayMove(items, oldIndex, newIndex),
          };
          setColumns(next);
        }
      }
    }

    const finalItems = next[activeContainer] ?? [];
    const finalIndex = finalItems.findIndex((d) => d.id === active.id);
    const moved = activeContainer !== origin.stageId || finalIndex !== origin.index;
    if (moved) {
      commitMove(String(active.id), activeContainer, next);
    }
    snapshotRef.current = null;
    originRef.current = null;
  }

  function handleDragCancel() {
    if (snapshotRef.current) setColumns(snapshotRef.current);
    setActiveDeal(null);
    snapshotRef.current = null;
    originRef.current = null;
  }

  function moveToStageEnd(deal: BoardDeal, stageId: string) {
    if (stageId === deal.stageId) return;
    const snapshot = columns;
    setColumns((prev) => {
      const source = (prev[deal.stageId] ?? []).filter((d) => d.id !== deal.id);
      const target = [...(prev[stageId] ?? []), { ...deal, stageId }];
      return { ...prev, [deal.stageId]: source, [stageId]: target };
    });
    const targetStage = stages.find((s) => s.id === stageId);
    startTransition(async () => {
      const result = await moveDealAction({ dealId: deal.id, stageId, prevDealId: null, nextDealId: null });
      if (!result.ok) {
        setColumns(snapshot);
        toast.error(result.error);
        return;
      }
      if (targetStage?.isWon) toast.success("Deal marked as won");
      else if (targetStage?.isLost) toast("Deal marked as lost");
      router.refresh();
    });
  }

  function deleteDeal(deal: BoardDeal) {
    const snapshot = columns;
    setColumns((prev) => ({
      ...prev,
      [deal.stageId]: (prev[deal.stageId] ?? []).filter((d) => d.id !== deal.id),
    }));
    startTransition(async () => {
      const result = await softDeleteDealAction(deal.id);
      if (!result.ok) {
        setColumns(snapshot);
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
            } else {
              toast.error(restored.error);
            }
          },
        },
      });
      router.refresh();
    });
  }

  function openEdit(deal: BoardDeal) {
    setEditingDeal(toEditableDeal(deal));
  }

  const totalOpenDeals = useMemo(
    () =>
      stages
        .filter((s) => !s.isWon && !s.isLost)
        .reduce((sum, s) => sum + (columns[s.id]?.length ?? 0), 0),
    [stages, columns],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ViewToggle view="board" />
          <p className="hidden text-sm text-muted-foreground sm:block">
            {totalOpenDeals} open deal{totalOpenDeals === 1 ? "" : "s"} · drag cards between stages
          </p>
        </div>
        {canWrite ? (
          <Button
            size="sm"
            onClick={() => {
              setNewStageId(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            New deal
          </Button>
        ) : null}
      </div>

      <DndContext
        id="deals-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="min-h-0 flex-1 overflow-x-auto px-4 pb-4 sm:px-6">
          <div className="flex h-full min-h-[420px] items-stretch gap-3">
            {stages.map((stage) => (
              <BoardColumn
                key={stage.id}
                stage={stage}
                deals={columns[stage.id] ?? []}
                canWrite={canWrite}
                stages={stages}
                onAdd={() => {
                  setNewStageId(stage.id);
                  setDialogOpen(true);
                }}
                onEdit={openEdit}
                onMove={moveToStageEnd}
                onDelete={deleteDeal}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="rotate-2">
              <DealCardContent deal={activeDeal} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        options={{ ...options, stages }}
        defaultStageId={newStageId}
        currentUserId={currentUserId}
      />
      <DealDialog
        open={Boolean(editingDeal)}
        onOpenChange={(open) => {
          if (!open) setEditingDeal(null);
        }}
        options={{ ...options, stages }}
        deal={editingDeal}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export function ViewToggle({ view }: { view: "board" | "table" }) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/50 p-0.5" role="tablist" aria-label="Deals view">
      <Link
        href="/app/deals"
        role="tab"
        aria-selected={view === "board"}
        className={cn(
          "rounded-md px-2.5 py-1 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          view === "board" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Board
      </Link>
      <Link
        href="/app/deals?view=table"
        role="tab"
        aria-selected={view === "table"}
        className={cn(
          "rounded-md px-2.5 py-1 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          view === "table" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Table
      </Link>
    </div>
  );
}

function BoardColumn({
  stage,
  deals,
  canWrite,
  stages,
  onAdd,
  onEdit,
  onMove,
  onDelete,
}: {
  stage: BoardStage;
  deals: BoardDeal[];
  canWrite: boolean;
  stages: BoardStage[];
  onAdd: () => void;
  onEdit: (deal: BoardDeal) => void;
  onMove: (deal: BoardDeal, stageId: string) => void;
  onDelete: (deal: BoardDeal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const colors = stageColor(stage.color);
  const totalCents = deals.reduce((sum, d) => sum + d.valueCents, 0);

  return (
    <section
      aria-label={`${stage.name} column`}
      className={cn(
        "flex h-full w-[272px] shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver && "border-ring/60 bg-muted/70",
        stage.isLost && "opacity-80",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} aria-hidden="true" />
        <h3 className="truncate text-sm font-semibold">{stage.name}</h3>
        <Badge variant="secondary" className="px-1.5 text-[10px] tabular-nums">
          {deals.length}
        </Badge>
        <span className="ml-auto text-xs font-medium text-muted-foreground tabular-nums">
          {formatCompactMoney(totalCents)}
        </span>
      </header>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        {stage.isWon ? "Closed won" : stage.isLost ? "Closed lost" : `${stage.probability}% win likelihood`}
      </p>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {deals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              {canWrite ? "Drop a deal here" : "No deals"}
            </div>
          ) : (
            deals.map((deal) => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                canWrite={canWrite}
                stages={stages}
                onEdit={onEdit}
                onMove={onMove}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
      {canWrite ? (
        <footer className="p-2 pt-0">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onAdd}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add deal
          </Button>
        </footer>
      ) : null}
    </section>
  );
}

function SortableDealCard({
  deal,
  canWrite,
  stages,
  onEdit,
  onMove,
  onDelete,
}: {
  deal: BoardDeal;
  canWrite: boolean;
  stages: BoardStage[];
  onEdit: (deal: BoardDeal) => void;
  onMove: (deal: BoardDeal, stageId: string) => void;
  onDelete: (deal: BoardDeal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    disabled: !canWrite,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <DealCardContent
        deal={deal}
        canWrite={canWrite}
        stages={stages}
        onEdit={onEdit}
        onMove={onMove}
        onDelete={onDelete}
        dragHandleProps={canWrite ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

function DealCardContent({
  deal,
  dragging = false,
  canWrite = false,
  stages = [],
  onEdit,
  onMove,
  onDelete,
  dragHandleProps,
}: {
  deal: BoardDeal;
  dragging?: boolean;
  canWrite?: boolean;
  stages?: BoardStage[];
  onEdit?: (deal: BoardDeal) => void;
  onMove?: (deal: BoardDeal, stageId: string) => void;
  onDelete?: (deal: BoardDeal) => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const isClosed = Boolean(deal.closedAt);
  const dueInDays = deal.expectedCloseDate ? daysUntil(deal.expectedCloseDate) : null;
  const overdue = !isClosed && dueInDays !== null && dueInDays < 0;

  return (
    <article
      className={cn(
        "group rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-shadow",
        dragging ? "shadow-lg ring-2 ring-ring/40" : "hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-1.5">
        {dragHandleProps ? (
          <button
            type="button"
            aria-label={`Drag ${deal.title}`}
            className="-ml-1 mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
        <Link
          href={`/app/deals/${deal.id}`}
          className="min-w-0 flex-1 rounded-sm text-sm leading-snug font-medium underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {deal.title}
        </Link>
        {canWrite && onEdit && onMove && onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Actions for ${deal.title}`}
                  className="-mr-1 -mt-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                />
              }
            >
              <MoreHorizontal aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(deal)} className="gap-2">
                <Pencil className="size-4" aria-hidden="true" />
                Edit deal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                {stages
                  .filter((s) => s.id !== deal.stageId)
                  .map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => onMove(deal, s.id)} className="gap-2">
                      <span className={cn("size-2 rounded-full", stageColor(s.color).dot)} aria-hidden="true" />
                      {s.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(deal)} className="gap-2">
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatCompactMoney(deal.valueCents)}
        </span>
        {deal.owner ? (
          <Avatar className="size-5" title={deal.owner.name}>
            <AvatarFallback className="bg-primary/10 text-[9px] font-semibold text-primary">
              {initials(deal.owner.name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{deal.company?.name ?? "No company"}</span>
        {deal.expectedCloseDate ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 tabular-nums",
              overdue && "font-medium text-destructive",
            )}
            title={overdue ? "Past expected close date" : "Expected close date"}
          >
            <CalendarDays className="size-3" aria-hidden="true" />
            {formatShortDate(deal.expectedCloseDate)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
