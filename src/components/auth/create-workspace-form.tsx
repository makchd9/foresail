"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createWorkspaceAction } from "@/server/actions/workspace";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspaceAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.push("/app");
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
          <Input
            id="workspace-name"
            name="name"
            placeholder="Acme Sales"
            required
            aria-invalid={Boolean(fieldErrors?.name) || undefined}
          />
          <FieldDescription>Usually your team or company name.</FieldDescription>
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <PendingButton pending={pending || Boolean(state?.ok)} pendingText="Creating…" className="w-full">
          Create workspace
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
