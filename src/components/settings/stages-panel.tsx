"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createStageAction,
  deleteStageAction,
  moveStageAction,
  updateStageAction,
} from "@/server/actions/stages";
import { STAGE_COLORS } from "@/lib/stages";
import { stageColor } from "@/lib/stage-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type StageRowData = {
  id: string;
  name: string;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
  dealCount: number;
};

const colorItems = STAGE_COLORS.map((c) => ({ value: c, label: c }));

export function StagesPanel({
  stages,
  canManage,
  isDemoWorkspace,
}: {
  stages: StageRowData[];
  canManage: boolean;
  isDemoWorkspace: boolean;
}) {
  const editable = canManage && !isDemoWorkspace;
  const openStages = stages.filter((s) => !s.isWon && !s.isLost);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each stage carries a win likelihood — it&apos;s what turns raw pipeline into the weighted
        forecast. Won and Lost are structural and keep 100% / 0%.
      </p>
      {isDemoWorkspace ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Stage editing is locked in the shared demo workspace — create your own workspace to
          reshape the pipeline.
        </p>
      ) : null}
      <ul className="space-y-2">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            editable={editable}
            isFirstOpen={openStages[0]?.id === stage.id}
            isLastOpen={openStages[openStages.length - 1]?.id === stage.id}
            position={index}
          />
        ))}
      </ul>
      {editable ? <AddStageRow /> : null}
    </div>
  );
}

function StageRow({
  stage,
  editable,
  isFirstOpen,
  isLastOpen,
}: {
  stage: StageRowData;
  editable: boolean;
  isFirstOpen: boolean;
  isLastOpen: boolean;
  position: number;
}) {
  const [name, setName] = useState(stage.name);
  const [probability, setProbability] = useState(String(stage.probability));
  const [color, setColor] = useState(stage.color);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const structural = stage.isWon || stage.isLost;
  const dirty =
    name !== stage.name || color !== stage.color || Number(probability) !== stage.probability;

  function save() {
    startTransition(async () => {
      const result = await updateStageAction(stage.id, {
        name,
        probability: Number(probability),
        color,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Stage saved");
      router.refresh();
    });
  }

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveStageAction(stage.id, direction);
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteStageAction(stage.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${stage.name}`);
      router.refresh();
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5">
      {editable ? (
        <Select value={color} items={colorItems} onValueChange={(v) => v && setColor(v as string)}>
          <SelectTrigger size="sm" className="w-24" aria-label={`Color for ${stage.name}`}>
            <SelectValue>
              <span className={cn("size-2.5 rounded-full", stageColor(color).dot)} />
              {color}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {colorItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <span className={cn("size-2.5 rounded-full", stageColor(item.value).dot)} />
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className={cn("mx-2 size-2.5 rounded-full", stageColor(stage.color).dot)} aria-hidden="true" />
      )}

      {editable ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`Name for stage ${stage.name}`}
          className="h-8 w-40"
        />
      ) : (
        <span className="w-40 text-sm font-medium">{stage.name}</span>
      )}

      <div className="flex items-center gap-1.5">
        {editable && !structural ? (
          <Input
            value={probability}
            onChange={(e) => setProbability(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            inputMode="numeric"
            aria-label={`Win likelihood for ${stage.name}`}
            className="h-8 w-16 text-right tabular-nums"
          />
        ) : (
          <span className="w-16 text-right text-sm tabular-nums">{stage.probability}</span>
        )}
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      <Badge variant="secondary" className="tabular-nums">
        {stage.dealCount} deal{stage.dealCount === 1 ? "" : "s"}
      </Badge>
      {stage.isWon ? <Badge className="border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Won</Badge> : null}
      {stage.isLost ? <Badge className="border-transparent bg-rose-500/10 text-rose-700 dark:text-rose-300">Lost</Badge> : null}

      <div className="ml-auto flex items-center gap-1">
        {dirty && editable ? (
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        ) : null}
        {editable && !structural ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${stage.name} up`}
              disabled={pending || isFirstOpen}
              onClick={() => move("up")}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${stage.name} down`}
              disabled={pending || isLastOpen}
              onClick={() => move("down")}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${stage.name}`}
              disabled={pending || stage.dealCount > 0}
              title={stage.dealCount > 0 ? "Move its deals first" : undefined}
              onClick={remove}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function AddStageRow() {
  const [name, setName] = useState("");
  const [probability, setProbability] = useState("40");
  const [color, setColor] = useState<string>("fuchsia");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    startTransition(async () => {
      const result = await createStageAction({ name, probability: Number(probability), color });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added ${name}`);
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed px-3 py-2.5">
      <Select value={color} items={colorItems} onValueChange={(v) => v && setColor(v as string)}>
        <SelectTrigger size="sm" className="w-24" aria-label="New stage color">
          <SelectValue>
            <span className={cn("size-2.5 rounded-full", stageColor(color).dot)} />
            {color}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {colorItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <span className={cn("size-2.5 rounded-full", stageColor(item.value).dot)} />
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New stage name"
        aria-label="New stage name"
        className="h-8 w-40"
      />
      <div className="flex items-center gap-1.5">
        <Input
          value={probability}
          onChange={(e) => setProbability(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          inputMode="numeric"
          aria-label="New stage win likelihood"
          className="h-8 w-16 text-right tabular-nums"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <Button size="sm" className="ml-auto" onClick={add} disabled={pending || !name.trim()}>
        <Plus data-icon="inline-start" aria-hidden="true" />
        {pending ? "Adding…" : "Add stage"}
      </Button>
    </div>
  );
}
