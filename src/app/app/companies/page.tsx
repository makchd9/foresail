import type { Metadata } from "next";
import { Download } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { COMPANY_SORTS, getCompaniesTable } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { parseListParams } from "@/lib/list-params";
import { CompaniesTable } from "@/components/companies/companies-table";
import { PaginationBar } from "@/components/data-table/pagination-bar";
import { TableSearch } from "@/components/data-table/table-search";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Companies",
  description: "The accounts you're selling into.",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireWorkspacePage();
  const params = await searchParams;
  const listParams = parseListParams(params, {
    defaultSort: "name",
    allowedSorts: COMPANY_SORTS,
  });

  const [page, anyCompanies] = await Promise.all([
    getCompaniesTable(context.workspace.id, listParams),
    db.company.count({ where: { workspaceId: context.workspace.id } }),
  ]);

  const exportQs = listParams.q ? `?q=${encodeURIComponent(listParams.q)}` : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Companies" description="The accounts you're selling into" />
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <TableSearch placeholder="Search name or domain…" />
        <a
          href={`/api/export/companies${exportQs}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
          download
        >
          <Download data-icon="inline-start" aria-hidden="true" />
          Export CSV
        </a>
      </div>
      <div className="min-h-0 flex-1">
        <CompaniesTable
          rows={page.rows}
          canWrite={context.canWrite}
          params={listParams}
          openNewOnMount={params.new === "1"}
          hasAnyCompanies={anyCompanies > 0}
        />
      </div>
      <PaginationBar
        basePath="/app/companies"
        params={listParams}
        total={page.total}
        shown={page.rows.length}
        hasNext={page.hasNext}
        hasPrev={page.hasPrev}
        startCursor={page.startCursor}
        endCursor={page.endCursor}
        noun="companies"
      />
    </div>
  );
}
