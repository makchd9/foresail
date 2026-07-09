"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCompanyAction } from "@/server/actions/companies";
import type { CompanyRow } from "@/server/queries/companies";
import type { ListParams } from "@/lib/list-params";
import { CompanyDialog, type EditableCompany } from "@/components/companies/company-dialog";
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

export function CompaniesTable({
  rows,
  canWrite,
  params,
  openNewOnMount,
  hasAnyCompanies,
}: {
  rows: CompanyRow[];
  canWrite: boolean;
  params: ListParams;
  openNewOnMount: boolean;
  hasAnyCompanies: boolean;
}) {
  const [newOpen, setNewOpen] = useState(openNewOnMount && canWrite);
  const [editing, setEditing] = useState<EditableCompany | null>(null);
  const [deleting, setDeleting] = useState<CompanyRow | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (openNewOnMount) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(`/app/companies${params.size ? `?${params}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmDelete() {
    const company = deleting;
    if (!company) return;
    startTransition(async () => {
      const result = await deleteCompanyAction(company.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${company.name}`);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end px-4 pb-3 sm:px-6">
        {canWrite ? (
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            New company
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 sm:px-6">
          <EmptyState
            icon={<Building2 className="size-6" aria-hidden="true" />}
            title={hasAnyCompanies ? "No companies match" : "No companies yet"}
            description={
              hasAnyCompanies
                ? "Try a different search."
                : "Add the accounts you're selling into — deals and contacts attach to them."
            }
          >
            {hasAnyCompanies ? (
              <Button variant="outline" onClick={() => router.replace("/app/companies")}>
                Clear search
              </Button>
            ) : canWrite ? (
              <Button onClick={() => setNewOpen(true)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add your first company
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
                  <SortHeader label="Name" field="name" params={params} basePath="/app/companies" />
                </TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Open deals</TableHead>
                <TableHead>
                  <SortHeader
                    label="Added"
                    field="createdAt"
                    params={params}
                    basePath="/app/companies"
                    defaultDir="desc"
                  />
                </TableHead>
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => setEditing(toEditable(company))}
                        className="rounded-sm text-left underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {company.name}
                      </button>
                    ) : (
                      company.name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{company.domain ?? "—"}</TableCell>
                  <TableCell>{company.industry ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{company.location ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{company._count.contacts}</TableCell>
                  <TableCell className="text-right tabular-nums">{company._count.deals}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatShortDate(company.createdAt)}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${company.name}`} />
                          }
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => setEditing(toEditable(company))} className="gap-2">
                            <Pencil className="size-4" aria-hidden="true" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(company)}
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

      <CompanyDialog open={newOpen} onOpenChange={setNewOpen} />
      <CompanyDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        company={editing}
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
              Its contacts and deals stay — they just lose the company link. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending}>
              Delete company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function toEditable(company: CompanyRow): EditableCompany {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    size: company.size,
    location: company.location,
    notes: company.notes,
  };
}
