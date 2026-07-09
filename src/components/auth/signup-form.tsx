"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";

import { signUpAction } from "@/server/actions/auth";
import { FormAlert, toFieldErrors } from "@/components/form-alert";
import { PendingButton } from "@/components/pending-button";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const router = useRouter();

  if (state?.ok) {
    const demoLink = state.data.demoVerifyLink;
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="font-semibold">Your account is ready</h2>
          <p className="text-sm text-muted-foreground">
            {demoLink
              ? "One step left: verify your email to unlock editing."
              : "We've emailed you a verification link. Verify to unlock editing."}
          </p>
        </div>
        {demoLink ? (
          <div className="space-y-2 rounded-lg border border-dashed bg-muted/40 p-3 text-left text-sm">
            <p className="text-muted-foreground">
              This deployment doesn&apos;t send real email, so your verification link is shown here
              instead:
            </p>
            <Button className="w-full" render={<a href={demoLink} />}>
              Verify my email
            </Button>
          </div>
        ) : null}
        <Button
          variant={demoLink ? "outline" : "default"}
          className="w-full"
          onClick={() => {
            router.push("/app");
            router.refresh();
          }}
        >
          Skip for now — explore read-only
        </Button>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="signup-name">Name</FieldLabel>
          <Input
            id="signup-name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            required
            aria-invalid={Boolean(fieldErrors?.name) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.email) || undefined}>
          <FieldLabel htmlFor="signup-email">Work email</FieldLabel>
          <Input
            id="signup-email"
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
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
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
        <PendingButton pending={pending} pendingText="Creating your workspace…" className="w-full">
          Create free account
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
