"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signInAction } from "@/server/actions/auth";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        {from ? <input type="hidden" name="from" value={from} /> : null}
        <Field data-invalid={Boolean(fieldErrors?.email) || undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            aria-invalid={Boolean(fieldErrors?.email) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "email")} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.password) || undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(fieldErrors?.password) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "password")} />
        </Field>
        <PendingButton pending={pending || Boolean(state?.ok)} pendingText="Signing in…" className="w-full">
          Sign in
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
