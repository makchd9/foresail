"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createCompanyAction, updateCompanyAction } from "@/server/actions/companies";
import { COMPANY_SIZES } from "@/lib/validators/contact";
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

export type EditableCompany = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  notes: string | null;
};

export function CompanyDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: EditableCompany | null;
}) {
  const isEdit = Boolean(company);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit company" : "New company"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the account details." : "Add an account you're selling into."}
          </DialogDescription>
        </DialogHeader>
        <CompanyForm key={company?.id ?? "new"} company={company ?? null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CompanyForm({
  company,
  onDone,
}: {
  company: EditableCompany | null;
  onDone: () => void;
}) {
  const isEdit = Boolean(company);
  const action = company ? updateCompanyAction.bind(null, company.id) : createCompanyAction;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Company updated" : "Company added");
      onDone();
      router.refresh();
    }
  }, [state, isEdit, onDone, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const sizeItems = [
    { value: "none", label: "Unknown" },
    ...COMPANY_SIZES.map((s) => ({ value: s, label: `${s} people` })),
  ];

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="company-name">Name</FieldLabel>
          <Input
            id="company-name"
            name="name"
            placeholder="Acme Industries"
            defaultValue={company?.name ?? ""}
            required
            aria-invalid={Boolean(fieldErrors?.name) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={Boolean(fieldErrors?.domain) || undefined}>
            <FieldLabel htmlFor="company-domain">Domain</FieldLabel>
            <Input
              id="company-domain"
              name="domain"
              placeholder="acme.com"
              defaultValue={company?.domain ?? ""}
              aria-invalid={Boolean(fieldErrors?.domain) || undefined}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "domain")} />
          </Field>
          <Field data-invalid={Boolean(fieldErrors?.industry) || undefined}>
            <FieldLabel htmlFor="company-industry">Industry</FieldLabel>
            <Input
              id="company-industry"
              name="industry"
              placeholder="Manufacturing"
              defaultValue={company?.industry ?? ""}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "industry")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="company-size">Size</FieldLabel>
            <Select name="size" items={sizeItems} defaultValue={company?.size ?? "none"}>
              <SelectTrigger id="company-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={Boolean(fieldErrors?.location) || undefined}>
            <FieldLabel htmlFor="company-location">Location</FieldLabel>
            <Input
              id="company-location"
              name="location"
              placeholder="Austin, US"
              defaultValue={company?.location ?? ""}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "location")} />
          </Field>
        </div>
        <Field data-invalid={Boolean(fieldErrors?.notes) || undefined}>
          <FieldLabel htmlFor="company-notes">Notes</FieldLabel>
          <Textarea
            id="company-notes"
            name="notes"
            rows={2}
            placeholder="Account context…"
            defaultValue={company?.notes ?? ""}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "notes")} />
        </Field>
        <PendingButton pending={pending} pendingText={isEdit ? "Saving…" : "Adding…"} className="w-full">
          {isEdit ? "Save changes" : "Add company"}
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
