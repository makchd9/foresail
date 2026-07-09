"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createDealAction, updateDealAction } from "@/server/actions/deals";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export type DealDialogStage = {
  id: string;
  name: string;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
};

export type DealFormOptions = {
  stages: DealDialogStage[];
  companies: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; name: string; companyId: string | null }>;
  members: Array<{ id: string; name: string }>;
};

export type EditableDeal = {
  id: string;
  title: string;
  valueCents: number;
  stageId: string;
  companyId: string | null;
  contactId: string | null;
  ownerId: string | null;
  expectedCloseDate: Date | null;
  lostReason: string | null;
};

type DealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: DealFormOptions;
  deal?: EditableDeal | null;
  defaultStageId?: string;
  currentUserId?: string;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function DealDialog({
  open,
  onOpenChange,
  options,
  deal,
  defaultStageId,
  currentUserId,
}: DealDialogProps) {
  const isEdit = Boolean(deal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit deal" : "New deal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details — changes are logged to the activity trail."
              : "Add a deal to your pipeline. You can refine it any time."}
          </DialogDescription>
        </DialogHeader>
        <DealForm
          key={deal?.id ?? "new"}
          options={options}
          deal={deal ?? null}
          defaultStageId={defaultStageId}
          currentUserId={currentUserId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DealForm({
  options,
  deal,
  defaultStageId,
  currentUserId,
  onDone,
}: {
  options: DealFormOptions;
  deal: EditableDeal | null;
  defaultStageId?: string;
  currentUserId?: string;
  onDone: () => void;
}) {
  const isEdit = Boolean(deal);
  const action = deal ? updateDealAction.bind(null, deal.id) : createDealAction;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  const initialStageId = deal?.stageId ?? defaultStageId ?? options.stages[0]?.id ?? "";
  const [stageId, setStageId] = useState(initialStageId);
  const selectedStage = options.stages.find((s) => s.id === stageId);

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Deal updated" : "Deal created");
      onDone();
      router.refresh();
    }
  }, [state, isEdit, onDone, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const stageItems = options.stages.map((s) => ({ value: s.id, label: s.name }));
  const companyItems = [
    { value: "none", label: "No company" },
    ...options.companies.map((c) => ({ value: c.id, label: c.name })),
  ];
  const contactItems = [
    { value: "none", label: "No contact" },
    ...options.contacts.map((c) => ({ value: c.id, label: c.name })),
  ];
  const memberItems = [
    { value: "none", label: "Unassigned" },
    ...options.members.map((m) => ({ value: m.id, label: m.name })),
  ];

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.title) || undefined}>
          <FieldLabel htmlFor="deal-title">Title</FieldLabel>
          <Input
            id="deal-title"
            name="title"
            placeholder="Acme Corp — Annual license"
            defaultValue={deal?.title ?? ""}
            required
            aria-invalid={Boolean(fieldErrors?.title) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "title")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={Boolean(fieldErrors?.value) || undefined}>
            <FieldLabel htmlFor="deal-value">Value (USD)</FieldLabel>
            <Input
              id="deal-value"
              name="value"
              inputMode="decimal"
              placeholder="25000"
              defaultValue={deal ? String(deal.valueCents / 100) : ""}
              aria-invalid={Boolean(fieldErrors?.value) || undefined}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "value")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="deal-close-date">Expected close</FieldLabel>
            <Input
              id="deal-close-date"
              name="expectedCloseDate"
              type="date"
              defaultValue={toDateInputValue(deal?.expectedCloseDate)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="deal-stage">Stage</FieldLabel>
          <Select
            name="stageId"
            items={stageItems}
            value={stageId}
            onValueChange={(value) => setStageId((value as string) ?? initialStageId)}
          >
            <SelectTrigger id="deal-stage" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className={cn("size-2 rounded-full", stageColor(stage.color).dot)} />
                  {stage.name}
                  <span className="text-xs text-muted-foreground">{stage.probability}%</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStage?.isWon || selectedStage?.isLost ? (
            <p className="text-xs text-muted-foreground">
              Deals in this stage count as closed {selectedStage.isWon ? "won" : "lost"}.
            </p>
          ) : null}
        </Field>

        {selectedStage?.isLost ? (
          <Field data-invalid={Boolean(fieldErrors?.lostReason) || undefined}>
            <FieldLabel htmlFor="deal-lost-reason">Lost reason</FieldLabel>
            <Textarea
              id="deal-lost-reason"
              name="lostReason"
              rows={2}
              placeholder="Chose a competitor, budget cut…"
              defaultValue={deal?.lostReason ?? ""}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "lostReason")} />
          </Field>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="deal-company">Company</FieldLabel>
            <Select name="companyId" items={companyItems} defaultValue={deal?.companyId ?? "none"}>
              <SelectTrigger id="deal-company" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companyItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="deal-contact">Contact</FieldLabel>
            <Select name="contactId" items={contactItems} defaultValue={deal?.contactId ?? "none"}>
              <SelectTrigger id="deal-contact" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="deal-owner">Owner</FieldLabel>
          <Select
            name="ownerId"
            items={memberItems}
            defaultValue={deal?.ownerId ?? currentUserId ?? "none"}
          >
            <SelectTrigger id="deal-owner" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {memberItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <PendingButton pending={pending} pendingText={isEdit ? "Saving…" : "Creating…"} className="w-full">
          {isEdit ? "Save changes" : "Create deal"}
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
