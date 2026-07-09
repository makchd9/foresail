"use client";

import { useActionState } from "react";
import { Info, MailCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/server/actions/auth";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);

  if (state?.ok) {
    const { mailConfigured } = state.data;
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {mailConfigured ? (
            <MailCheck className="size-6" aria-hidden="true" />
          ) : (
            <Info className="size-6" aria-hidden="true" />
          )}
        </div>
        {mailConfigured ? (
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, a reset link is on its way. It expires in 30
            minutes.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This demo deployment doesn&apos;t send email, and for security reset links are never
            shown on-screen. Use the demo login instead:{" "}
            <span className="font-mono">demo@foresail.app / demo1234</span>
          </p>
        )}
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.email) || undefined}>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            aria-invalid={Boolean(fieldErrors?.email) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "email")} />
        </Field>
        <PendingButton pending={pending} pendingText="Sending…" className="w-full">
          Send reset link
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
