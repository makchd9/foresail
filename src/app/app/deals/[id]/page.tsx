import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Mail, User } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { getDealDetail } from "@/server/queries/deal-detail";
import { getDealFormOptions } from "@/server/queries/board";
import { ActivityItem } from "@/components/activity-item";
import { DealDetailActions, StageQuickSelect } from "@/components/deals/deal-detail-actions";
import { NoteComposer } from "@/components/deals/notes-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysUntil, formatDate, formatMoney, initials, relativeDays } from "@/lib/format";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Deal",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireWorkspacePage();
  const { id } = await params;

  const [detail, formOptions] = await Promise.all([
    getDealDetail(context.workspace.id, id),
    getDealFormOptions(context.workspace.id),
  ]);
  if (!detail) notFound();

  const { deal, activity } = detail;
  const stages = await stagesForWorkspace(context.workspace.id);
  const options = { stages, ...formOptions };

  const weightedCents = Math.round((deal.valueCents * deal.stage.probability) / 100);
  const isClosed = deal.stage.isWon || deal.stage.isLost;
  const dueDays = deal.expectedCloseDate ? daysUntil(deal.expectedCloseDate) : null;
  const overdue = !isClosed && dueDays !== null && dueDays < 0;
  const colors = stageColor(deal.stage.color);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-4 py-4 sm:px-6">
        <Link
          href="/app/deals"
          className="mb-2 inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Deals
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{deal.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge className={cn("border-transparent", colors.badge)}>
                <span className={cn("size-1.5 rounded-full", colors.dot)} aria-hidden="true" />
                {deal.stage.name}
              </Badge>
              {deal.company ? (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {deal.company.name}
                </span>
              ) : null}
              <span>Updated {relativeDays(deal.updatedAt)}</span>
            </div>
          </div>
          {context.canWrite ? (
            <DealDetailActions
              deal={{
                id: deal.id,
                title: deal.title,
                valueCents: deal.valueCents,
                stageId: deal.stageId,
                companyId: deal.companyId,
                contactId: deal.contactId,
                ownerId: deal.ownerId,
                expectedCloseDate: deal.expectedCloseDate,
                lostReason: deal.lostReason,
              }}
              options={options}
              currentUserId={context.user.id}
            />
          ) : null}
        </div>
      </div>

      <div className="grid flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes ({deal.notesList.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4 space-y-4">
              {context.canWrite ? <NoteComposer dealId={deal.id} /> : null}
              {deal.notesList.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No notes yet. {context.canWrite ? "Log the first call or next step above." : ""}
                </p>
              ) : (
                <ul className="space-y-3">
                  {deal.notesList.map((note) => (
                    <li key={note.id} className="rounded-lg border bg-card p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarFallback className="bg-muted text-[9px] font-semibold text-foreground/70">
                            {initials(note.author?.name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{note.author?.name ?? "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {relativeDays(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              {activity.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {activity.map((row) => (
                    <ActivityItem key={row.id} row={row} showEntityLabel={false} />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {formatMoney(deal.valueCents, context.workspace.currency)}
                </p>
                {!isClosed ? (
                  <p className="text-xs text-muted-foreground">
                    Weighted: <span className="font-medium text-foreground">{formatMoney(weightedCents, context.workspace.currency)}</span>{" "}
                    at {deal.stage.probability}%
                  </p>
                ) : null}
              </div>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Stage</p>
                {context.canWrite ? (
                  <StageQuickSelect dealId={deal.id} stageId={deal.stageId} stages={stages} />
                ) : (
                  <p className="font-medium">{deal.stage.name}</p>
                )}
                {deal.stage.isLost ? (
                  <p className="text-xs text-muted-foreground">
                    Lost reason: {deal.lostReason ?? "— add one via Edit"}
                  </p>
                ) : null}
              </div>
              <Separator />
              <dl className="space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Expected close</dt>
                    <dd className={cn("font-medium", overdue && "text-destructive")}>
                      {formatDate(deal.expectedCloseDate)}
                      {overdue ? " · overdue" : ""}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Owner</dt>
                    <dd className="font-medium">{deal.owner?.name ?? "Unassigned"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Company</dt>
                    <dd className="font-medium">{deal.company?.name ?? "—"}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Contact</dt>
                    <dd className="font-medium">
                      {deal.contact ? (
                        <>
                          {deal.contact.name}
                          {deal.contact.title ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {deal.contact.title}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
              <Separator />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Created {formatDate(deal.createdAt)}</p>
                {deal.closedAt ? <p>Closed {formatDate(deal.closedAt)}</p> : null}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

async function stagesForWorkspace(workspaceId: string) {
  const { db } = await import("@/lib/db");
  const stages = await db.stage.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, probability: true, color: true, isWon: true, isLost: true },
  });
  return stages;
}
