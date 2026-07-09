"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { resetPasswordAction } from "@/server/actions/auth";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">
          Your password has been updated. Sign in with the new one.
        </p>
        <Button className="w-full" render={<Link href="/login" />}>
          Go to sign in
        </Button>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <input type="hidden" name="token" value={token} />
        <Field data-invalid={Boolean(fieldErrors?.password) || undefined}>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors?.password) || undefined}
          />
          <FieldDescription>At least 8 characters.</FieldDescription>
          <FieldError errors={toFieldErrors(fieldErrors, "password")} />
        </Field>
        <PendingButton pending={pending} pendingText="Updating…" className="w-full">
          Set new password
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
