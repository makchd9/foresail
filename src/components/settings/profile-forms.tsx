"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { changePasswordAction, updateProfileAction } from "@/server/actions/settings";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ProfileNameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success("Profile updated");
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="profile-name">Name</FieldLabel>
          <Input id="profile-name" name="name" defaultValue={defaultName} required />
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <div>
          <PendingButton size="sm" pending={pending} pendingText="Saving…">
            Save name
          </PendingButton>
        </div>
      </FieldGroup>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Password changed");
      formRef.current?.reset();
    }
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.currentPassword) || undefined}>
          <FieldLabel htmlFor="current-password">Current password</FieldLabel>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <FieldError errors={toFieldErrors(fieldErrors, "currentPassword")} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.password) || undefined}>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
          <FieldError errors={toFieldErrors(fieldErrors, "password")} />
        </Field>
        <div>
          <PendingButton size="sm" pending={pending} pendingText="Changing…">
            Change password
          </PendingButton>
        </div>
      </FieldGroup>
    </form>
  );
}
