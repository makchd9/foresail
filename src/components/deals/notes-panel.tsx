"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addNoteAction } from "@/server/actions/deals";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function NoteComposer({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(addNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      toast.success("Note added");
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} className="space-y-2" noValidate>
      <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
      <input type="hidden" name="dealId" value={dealId} />
      <Field data-invalid={Boolean(fieldErrors?.body) || undefined}>
        <label htmlFor="note-body" className="sr-only">
          Add a note
        </label>
        <Textarea
          id="note-body"
          name="body"
          rows={3}
          placeholder="Log a call, next step, or anything the team should know…"
          aria-invalid={Boolean(fieldErrors?.body) || undefined}
        />
        <FieldError errors={toFieldErrors(fieldErrors, "body")} />
      </Field>
      <div className="flex justify-end">
        <PendingButton size="sm" pending={pending} pendingText="Adding…">
          Add note
        </PendingButton>
      </div>
    </form>
  );
}
