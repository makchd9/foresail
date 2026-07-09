"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteWorkspaceAction, updateWorkspaceAction } from "@/server/actions/workspace";
import { CURRENCIES } from "@/lib/validators/settings";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WorkspaceSettingsForm({
  defaultName,
  defaultCurrency,
}: {
  defaultName: string;
  defaultCurrency: string;
}) {
  const [state, formAction, pending] = useActionState(updateWorkspaceAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success("Workspace updated");
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const currencyItems = CURRENCIES.map((c) => ({ value: c, label: c }));

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="workspace-settings-name">Workspace name</FieldLabel>
          <Input id="workspace-settings-name" name="name" defaultValue={defaultName} required />
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <Field>
          <FieldLabel htmlFor="workspace-currency">Currency</FieldLabel>
          <Select name="currency" items={currencyItems} defaultValue={defaultCurrency}>
            <SelectTrigger id="workspace-currency" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Used for every value shown in this workspace.</FieldDescription>
        </Field>
        <div>
          <PendingButton size="sm" pending={pending} pendingText="Saving…">
            Save workspace
          </PendingButton>
        </div>
      </FieldGroup>
    </form>
  );
}

export function DeleteWorkspaceCard({ workspaceName }: { workspaceName: string }) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorkspaceAction(confirmText);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Workspace deleted");
      router.push("/app");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <h3 className="text-sm font-semibold">Delete this workspace</h3>
        <p className="text-sm text-muted-foreground">
          Every deal, contact, company, and the full activity trail — gone for good.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
          Delete workspace
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{workspaceName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent. Type <span className="font-mono font-medium">{workspaceName}</span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={workspaceName}
            aria-label="Type the workspace name to confirm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending || confirmText.trim() !== workspaceName}
            >
              {pending ? "Deleting…" : "I understand — delete it"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
