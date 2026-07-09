import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

import { requireWorkspacePage } from "@/server/workspace";
import { getDashboardData } from "@/server/queries/dashboard";
import { isWorkspaceEmpty } from "@/server/queries/board";
import { ActivityItem } from "@/components/activity-item";
import { ForecastChart, PipelineByStageChart } from "@/components/dashboard/charts";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { daysUntil, formatCompactMoney, formatMoney, formatShortDate } from "@/lib/format";
import { stageColor } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Pipeline health and weighted forecast at a glance.",
};

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="pb-0">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const context = await requireWorkspacePage();
  const empty = await isWorkspaceEmpty(context.workspace.id);

  if (empty) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="Dashboard" description={`Pipeline health for ${context.workspace.name}`} />
        <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <EmptyState
            icon={<TrendingUp className="size-6" aria-hidden="true" />}
            title="Nothing to forecast yet"
            description="Add your first deals and the dashboard lights up with pipeline totals, win rate, and a weighted forecast."
            className="w-full max-w-xl"
          >
            <Button render={<Link href="/app/deals" />}>Go to deals</Button>
          </EmptyState>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(context.workspace.id);
  const currency = context.workspace.currency;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Dashboard" description={`Pipeline health for ${context.workspace.name}`} />
      <div className="grid gap-4 p-4 sm:p-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Open pipeline"
            value={formatCompactMoney(data.openTotalCents, currency)}
            sub={`${data.openCount} open deal${data.openCount === 1 ? "" : "s"}`}
          />
          <KpiCard
            label="Weighted forecast"
            value={formatCompactMoney(data.weightedTotalCents, currency)}
            sub="Value × stage win likelihood"
          />
          <KpiCard
            label="Win rate"
            value={data.winRate === null ? "—" : `${Math.round(data.winRate * 100)}%`}
            sub={
              data.winRate === null
                ? "No closed deals yet"
                : `${data.wonCount} won · ${data.lostCount} lost`
            }
          />
          <KpiCard
            label="Won, last 90 days"
            value={formatCompactMoney(data.won90Cents, currency)}
            sub={`${data.won90Count} deal${data.won90Count === 1 ? "" : "s"} closed won`}
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Open pipeline by stage</CardTitle>
              <CardDescription>Raw value sitting in each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineByStageChart data={data.pipelineByStage} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Weighted forecast by close month</CardTitle>
              <CardDescription>
                What's realistically landing, based on stage probabilities
                {data.unscheduledCount > 0
                  ? ` · ${data.unscheduledCount} deal${data.unscheduledCount === 1 ? "" : "s"} (${formatCompactMoney(data.unscheduledWeightedCents, currency)} weighted) have no close date`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastChart data={data.forecastByMonth} />
            </CardContent>
          </Card>
        </div>

        {/* Lists row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Closing soon</CardTitle>
                <CardDescription>Open deals due in the next 30 days</CardDescription>
              </div>
              <Link
                href="/app/deals?view=table"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                All deals
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.closingSoon.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nothing due in the next 30 days.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.closingSoon.map((deal) => {
                    const overdue = daysUntil(deal.expectedCloseDate) < 0;
                    const colors = stageColor(deal.stageColor);
                    return (
                      <li key={deal.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/app/deals/${deal.id}`}
                            className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                          >
                            {deal.title}
                          </Link>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge className={cn("border-transparent px-1.5 py-0 text-[10px]", colors.badge)}>
                              {deal.stageName}
                            </Badge>
                            {deal.companyName ?? "No company"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold tabular-nums">
                            {formatMoney(deal.valueCents, currency)}
                          </p>
                          <p className={cn("text-xs tabular-nums", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
                            {formatShortDate(deal.expectedCloseDate)}
                            {overdue ? " · overdue" : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Recent activity</CardTitle>
                <CardDescription>Who changed what, most recent first</CardDescription>
              </div>
              <Link
                href="/app/activity"
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Full log
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.recentActivity.map((row) => (
                    <ActivityItem key={row.id} row={row} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
