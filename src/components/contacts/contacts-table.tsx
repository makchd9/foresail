"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { deleteContactAction } from "@/server/actions/contacts";
import type { ContactRow } from "@/server/queries/contacts";
import type { ListParams } from "@/lib/list-params";
import { ContactDialog, type EditableContact } from "@/components/contacts/contact-dialog";
import { EmptyState } from "@/components/empty-state";
import { SortHeader } from "@/components/data-table/sort-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";

export function ContactsTable({
  rows,
  companies,
  canWrite,
  params,
  openNewOnMount,
  hasAnyContacts,
}: {
  rows: ContactRow[];
  companies: Array<{ id: string; name: string }>;
  canWrite: boolean;
  params: ListParams;
  openNewOnMount: boolean;
  hasAnyContacts: boolean;
}) {
  const [newOpen, setNewOpen] = useState(openNewOnMount && canWrite);
  const [editing, setEditing] = useState<EditableContact | null>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (openNewOnMount) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(`/app/contacts${params.size ? `?${params}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmDelete() {
    const contact = deleting;
    if (!contact) return;
    startTransition(async () => {
      const result = await deleteContactAction(contact.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${contact.name}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end px-4 pb-3 sm:px-6">
        {canWrite ? (
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New contact
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 sm:px-6">
          <EmptyState
            icon={<Users className="size-6" aria-hidden="true" />}
            title={hasAnyContacts ? "No contacts match" : "No contacts yet"}
            description={
              hasAnyContacts
                ? "Try a different search, or clear the filters."
                : "Add the people you're selling to — they attach to deals and companies."
            }
          >
            {hasAnyContacts ? (
              <Button variant="outline" onClick={() => router.replace("/app/contacts")}>
                Clear search
              </Button>
            ) : canWrite ? (
              <Button onClick={() => setNewOpen(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add your first contact
              </Button>
            ) : null}
          </EmptyState>
        </div>
      ) : (
        <div className="overflow-x-auto px-4 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader label="Name" field="name" params={params} basePath="/app/contacts" />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Open deals</TableHead>
                <TableHead>
                  <SortHeader
                    label="Added"
                    field="createdAt"
                    params={params}
                    basePath="/app/contacts"
                    defaultDir="desc"
                  />
                </TableHead>
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => setEditing(toEditable(contact))}
                        className="rounded-sm text-left underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {contact.name}
                      </button>
                    ) : (
                      contact.name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.title ?? "—"}</TableCell>
                  <TableCell>{contact.company?.name ?? "—"}</TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{contact._count.deals}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatShortDate(contact.createdAt)}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${contact.name}`} />
                          }
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditing(toEditable(contact))} className="gap-2">
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(contact)}
                            className="gap-2"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactDialog open={newOpen} onOpenChange={setNewOpen} companies={companies} />
      <ContactDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        companies={companies}
        contact={editing}
      />
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Deals stay in place — they just lose this contact. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending}>
              Delete contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function toEditable(contact: ContactRow): EditableContact {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    companyId: contact.companyId,
    notes: contact.notes,
  };
}
