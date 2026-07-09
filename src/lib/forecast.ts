/**
 * Forecast math — the heart of the product, kept pure so it's trivially
 * unit-testable. All amounts are integer cents.
 */

export type ForecastDeal = {
  valueCents: number;
  probability: number; // 0–100
  expectedCloseDate: Date | null;
};

export type ForecastBucket = {
  key: string;
  label: string;
  weightedCents: number;
  totalCents: number;
  count: number;
};

/** value × stage probability, rounded to the nearest cent. */
export function weightedValueCents(valueCents: number, probability: number): number {
  return Math.round((valueCents * probability) / 100);
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
}

/**
 * Bucket open deals into: [Past due?] + the next `months` months by expected
 * close date. Deals without a close date are reported separately; deals past
 * the horizon are counted as omitted so callers never silently truncate.
 */
export function buildForecastBuckets(
  deals: ForecastDeal[],
  now: Date,
  months = 6,
): {
  buckets: ForecastBucket[];
  unscheduledCount: number;
  unscheduledWeightedCents: number;
  beyondHorizonCount: number;
} {
  const startOfCurrentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const pastDue: ForecastBucket = {
    key: "past",
    label: "Past due",
    weightedCents: 0,
    totalCents: 0,
    count: 0,
  };

  const buckets: ForecastBucket[] = [];
  const bucketIndex = new Map<string, ForecastBucket>();
  for (let i = 0; i < months; i++) {
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
  let beyondHorizonCount = 0;

  for (const deal of deals) {
    const weighted = weightedValueCents(deal.valueCents, deal.probability);
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
    } else {
      beyondHorizonCount += 1;
    }
  }

  return {
    buckets: pastDue.count > 0 ? [pastDue, ...buckets] : buckets,
    unscheduledCount,
    unscheduledWeightedCents,
    beyondHorizonCount,
  };
}

/** Win rate over closed deals; null until something has closed. */
export function winRate(wonCount: number, lostCount: number): number | null {
  const total = wonCount + lostCount;
  return total > 0 ? wonCount / total : null;
}
