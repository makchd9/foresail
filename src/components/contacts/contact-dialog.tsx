"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createContactAction, updateContactAction } from "@/server/actions/contacts";
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

export type EditableContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  companyId: string | null;
  notes: string | null;
};

export function ContactDialog({
  open,
  onOpenChange,
  companies,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Array<{ id: string; name: string }>;
  contact?: EditableContact | null;
}) {
  const isEdit = Boolean(contact);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contact" : "New contact"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this person's details." : "Add a person you're selling to."}
          </DialogDescription>
        </DialogHeader>
        <ContactForm
          key={contact?.id ?? "new"}
          companies={companies}
          contact={contact ?? null}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  companies,
  contact,
  onDone,
}: {
  companies: Array<{ id: string; name: string }>;
  contact: EditableContact | null;
  onDone: () => void;
}) {
  const isEdit = Boolean(contact);
  const action = contact ? updateContactAction.bind(null, contact.id) : createContactAction;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Contact updated" : "Contact added");
      onDone();
      router.refresh();
    }
  }, [state, isEdit, onDone, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const companyItems = [
    { value: "none", label: "No company" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <FormAlert tone="error" message={state && !state.ok ? state.error : null} />
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="contact-name">Name</FieldLabel>
          <Input
            id="contact-name"
            name="name"
            placeholder="Jane Cooper"
            defaultValue={contact?.name ?? ""}
            required
            aria-invalid={Boolean(fieldErrors?.name) || undefined}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "name")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={Boolean(fieldErrors?.email) || undefined}>
            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
            <Input
              id="contact-email"
              name="email"
              type="email"
              placeholder="jane@acme.com"
              defaultValue={contact?.email ?? ""}
              aria-invalid={Boolean(fieldErrors?.email) || undefined}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "email")} />
          </Field>
          <Field data-invalid={Boolean(fieldErrors?.phone) || undefined}>
            <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
            <Input
              id="contact-phone"
              name="phone"
              placeholder="+1 555 0100"
              defaultValue={contact?.phone ?? ""}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "phone")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={Boolean(fieldErrors?.title) || undefined}>
            <FieldLabel htmlFor="contact-title">Title</FieldLabel>
            <Input
              id="contact-title"
              name="title"
              placeholder="VP Operations"
              defaultValue={contact?.title ?? ""}
            />
            <FieldError errors={toFieldErrors(fieldErrors, "title")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contact-company">Company</FieldLabel>
            <Select name="companyId" items={companyItems} defaultValue={contact?.companyId ?? "none"}>
              <SelectTrigger id="contact-company" className="w-full">
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
        </div>
        <Field data-invalid={Boolean(fieldErrors?.notes) || undefined}>
          <FieldLabel htmlFor="contact-notes">Notes</FieldLabel>
          <Textarea
            id="contact-notes"
            name="notes"
            rows={2}
            placeholder="Context, preferences, anything useful…"
            defaultValue={contact?.notes ?? ""}
          />
          <FieldError errors={toFieldErrors(fieldErrors, "notes")} />
        </Field>
        <PendingButton pending={pending} pendingText={isEdit ? "Saving…" : "Adding…"} className="w-full">
          {isEdit ? "Save changes" : "Add contact"}
        </PendingButton>
      </FieldGroup>
    </form>
  );
}
