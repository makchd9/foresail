import "server-only";

import { db } from "@/lib/db";

const DAY = 24 * 60 * 60 * 1000;

export type StageSlice = {
  stageId: string;
  name: string;
  color: string;
  probability: number;
  count: number;
  totalCents: number;
  weightedCents: number;
};

export type ForecastBucket = {
  key: string;
  label: string;
  weightedCents: number;
  totalCents: number;
  count: number;
};

export type DashboardData = {
  openCount: number;
  openTotalCents: number;
  weightedTotalCents: number;
  winRate: number | null;
  wonCount: number;
  lostCount: number;
  won90Cents: number;
  won90Count: number;
  pipelineByStage: StageSlice[];
  forecastByMonth: ForecastBucket[];
  unscheduledCount: number;
  unscheduledWeightedCents: number;
  closingSoon: Array<{
    id: string;
    title: string;
    valueCents: number;
    expectedCloseDate: Date;
    stageName: string;
    stageColor: string;
    companyName: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityLabel: string;
    meta: unknown;
    createdAt: Date;
    actor: { name: string } | null;
  }>;
};

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
}

export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const [stages, openDeals, closedGroups, won90, closingSoonRows, recentActivity] =
    await Promise.all([
      db.stage.findMany({
        where: { workspaceId },
        orderBy: { order: "asc" },
        select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true },
      }),
      db.deal.findMany({
        where: { workspaceId, deletedAt: null, stage: { isWon: false, isLost: false } },
        select: { valueCents: true, stageId: true, expectedCloseDate: true },
      }),
      db.deal.groupBy({
        by: ["stageId"],
        where: { workspaceId, deletedAt: null, stage: { OR: [{ isWon: true }, { isLost: true }] } },
        _count: { _all: true },
      }),
      db.deal.aggregate({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { isWon: true },
          closedAt: { gte: new Date(Date.now() - 90 * DAY) },
        },
        _sum: { valueCents: true },
        _count: { _all: true },
      }),
      db.deal.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          stage: { isWon: false, isLost: false },
          expectedCloseDate: { not: null, lte: new Date(Date.now() + 30 * DAY) },
        },
        orderBy: { expectedCloseDate: "asc" },
        take: 6,
        select: {
          id: true,
          title: true,
          valueCents: true,
          expectedCloseDate: true,
          stage: { select: { name: true, color: true } },
          company: { select: { name: true } },
        },
      }),
      db.activityLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityLabel: true,
          meta: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      }),
    ]);

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const openStages = stages.filter((s) => !s.isWon && !s.isLost);

  // Pipeline by stage (open stages only)
  const sliceByStage = new Map<string, StageSlice>(
    openStages.map((s) => [
      s.id,
      {
        stageId: s.id,
        name: s.name,
        color: s.color,
        probability: s.probability,
        count: 0,
        totalCents: 0,
        weightedCents: 0,
      },
    ]),
  );

  let openTotalCents = 0;
  let weightedTotalCents = 0;
  for (const deal of openDeals) {
    const stage = stageById.get(deal.stageId);
    if (!stage) continue;
    const weighted = Math.round((deal.valueCents * stage.probability) / 100);
    openTotalCents += deal.valueCents;
    weightedTotalCents += weighted;
    const slice = sliceByStage.get(deal.stageId);
    if (slice) {
      slice.count += 1;
      slice.totalCents += deal.valueCents;
      slice.weightedCents += weighted;
    }
  }

  // Win rate from closed deals
  let wonCount = 0;
  let lostCount = 0;
  for (const group of closedGroups) {
    const stage = stageById.get(group.stageId);
    if (!stage) continue;
    if (stage.isWon) wonCount += group._count._all;
    if (stage.isLost) lostCount += group._count._all;
  }
  const closedTotal = wonCount + lostCount;

  // Weighted forecast bucketed by expected close month (next 6 months + past due)
  const now = new Date();
  const buckets: ForecastBucket[] = [];
  const bucketIndex = new Map<string, ForecastBucket>();
  const pastDue: ForecastBucket = { key: "past", label: "Past due", weightedCents: 0, totalCents: 0, count: 0 };
  for (let i = 0; i < 6; i++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const bucket: ForecastBucket = {
      key: monthKey(month),
      label: monthLabel(month),
      weightedCents: 0,
      totalCents: 0,
      count: 0,
    };
    buckets.push(bucket);
    bucketIndex.set(bucket.key, bucket);
  }

  let unscheduledCount = 0;
  let unscheduledWeightedCents = 0;
  const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (const deal of openDeals) {
    const stage = stageById.get(deal.stageId);
    if (!stage) continue;
    const weighted = Math.round((deal.valueCents * stage.probability) / 100);
    if (!deal.expectedCloseDate) {
      unscheduledCount += 1;
      unscheduledWeightedCents += weighted;
      continue;
    }
    if (deal.expectedCloseDate < startOfCurrentMonth) {
      pastDue.count += 1;
      pastDue.totalCents += deal.valueCents;
      pastDue.weightedCents += weighted;
      continue;
    }
    const bucket = bucketIndex.get(monthKey(deal.expectedCloseDate));
    if (bucket) {
      bucket.count += 1;
      bucket.totalCents += deal.valueCents;
      bucket.weightedCents += weighted;
    }
    // Deals further than 6 months out are intentionally omitted from the chart.
  }

  return {
    openCount: openDeals.length,
    openTotalCents,
    weightedTotalCents,
    winRate: closedTotal > 0 ? wonCount / closedTotal : null,
    wonCount,
    lostCount,
    won90Cents: won90._sum.valueCents ?? 0,
    won90Count: won90._count._all,
    pipelineByStage: [...sliceByStage.values()],
    forecastByMonth: pastDue.count > 0 ? [pastDue, ...buckets] : buckets,
    unscheduledCount,
    unscheduledWeightedCents,
    closingSoon: closingSoonRows.map((row) => ({
      id: row.id,
      title: row.title,
      valueCents: row.valueCents,
      expectedCloseDate: row.expectedCloseDate as Date,
      stageName: row.stage.name,
      stageColor: row.stage.color,
      companyName: row.company?.name ?? null,
    })),
    recentActivity,
  };
}
