import type { Metadata } from "next";
import { Download } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { CONTACT_SORTS, getContactsTable } from "@/server/queries/contacts";
import { db } from "@/lib/db";
import { parseListParams } from "@/lib/list-params";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { PaginationBar } from "@/components/data-table/pagination-bar";
import { TableSearch } from "@/components/data-table/table-search";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contacts",
  description: "The people behind your pipeline.",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireWorkspacePage();
  const params = await searchParams;
  const listParams = parseListParams(params, {
    defaultSort: "name",
    allowedSorts: CONTACT_SORTS,
  });

  const [page, companies, anyContacts] = await Promise.all([
    getContactsTable(context.workspace.id, listParams),
    db.company.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    db.contact.count({ where: { workspaceId: context.workspace.id } }),
  ]);

  const exportQs = listParams.q ? `?q=${encodeURIComponent(listParams.q)}` : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Contacts" description="The people behind your pipeline" />
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <TableSearch placeholder="Search name or email…" />
        <a
          href={`/api/export/contacts${exportQs}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
          download
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Export CSV
        </a>
      </div>
      <div className="min-h-0 flex-1">
        <ContactsTable
          rows={page.rows}
          companies={companies}
          canWrite={context.canWrite}
          params={listParams}
          openNewOnMount={params.new === "1"}
          hasAnyContacts={anyContacts > 0}
        />
      </div>
      <PaginationBar
        basePath="/app/contacts"
        params={listParams}
        total={page.total}
        shown={page.rows.length}
        hasNext={page.hasNext}
        hasPrev={page.hasPrev}
        startCursor={page.startCursor}
        endCursor={page.endCursor}
        noun="contacts"
      />
    </div>
  );
}
