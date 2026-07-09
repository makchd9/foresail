import { describe, expect, it } from "vitest";

import { buildForecastBuckets, monthKey, weightedValueCents, winRate } from "@/lib/forecast";

const NOW = new Date(Date.UTC(2026, 6, 9)); // 2026-07-09

function deal(valueCents: number, probability: number, closeDate: string | null) {
  return {
    valueCents,
    probability,
    expectedCloseDate: closeDate ? new Date(closeDate) : null,
  };
}

describe("weightedValueCents", () => {
  it("multiplies value by stage probability", () => {
    expect(weightedValueCents(10_000_00, 50)).toBe(5_000_00);
    expect(weightedValueCents(17_500_000, 75)).toBe(13_125_000);
  });

  it("handles the boundaries", () => {
    expect(weightedValueCents(123_45, 0)).toBe(0);
    expect(weightedValueCents(123_45, 100)).toBe(123_45);
    expect(weightedValueCents(0, 60)).toBe(0);
  });

  it("rounds to the nearest cent instead of truncating", () => {
    // 101 × 33% = 33.33 → 33; 105 × 33% = 34.65 → 35
    expect(weightedValueCents(101, 33)).toBe(33);
    expect(weightedValueCents(105, 33)).toBe(35);
  });
});

describe("buildForecastBuckets", () => {
  it("buckets deals into the next six months by close date", () => {
    const result = buildForecastBuckets(
      [
        deal(100_000, 50, "2026-07-20"), // this month
        deal(200_000, 25, "2026-08-02"), // next month
        deal(400_000, 10, "2026-12-31"), // month 5
      ],
      NOW,
    );

    expect(result.buckets).toHaveLength(6);
    expect(result.buckets[0]).toMatchObject({ key: "2026-07", count: 1, weightedCents: 50_000 });
    expect(result.buckets[1]).toMatchObject({ key: "2026-08", count: 1, weightedCents: 50_000 });
    expect(result.buckets[5]).toMatchObject({ key: "2026-12", count: 1, weightedCents: 40_000 });
  });

  it("prepends a past-due bucket only when overdue deals exist", () => {
    const withoutOverdue = buildForecastBuckets([deal(50_000, 50, "2026-07-15")], NOW);
    expect(withoutOverdue.buckets[0]?.key).toBe("2026-07");

    const withOverdue = buildForecastBuckets(
      [deal(80_000, 75, "2026-06-15"), deal(50_000, 50, "2026-07-15")],
      NOW,
    );
    expect(withOverdue.buckets[0]).toMatchObject({
      key: "past",
      count: 1,
      weightedCents: 60_000,
    });
    expect(withOverdue.buckets).toHaveLength(7);
  });

  it("separates unscheduled deals instead of hiding them", () => {
    const result = buildForecastBuckets(
      [deal(100_000, 30, null), deal(60_000, 50, null)],
      NOW,
    );
    expect(result.unscheduledCount).toBe(2);
    expect(result.unscheduledWeightedCents).toBe(60_000);
    expect(result.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("counts deals beyond the horizon so nothing silently disappears", () => {
    const result = buildForecastBuckets([deal(100_000, 50, "2027-06-01")], NOW);
    expect(result.beyondHorizonCount).toBe(1);
    expect(result.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("keeps totals and weighted values separate per bucket", () => {
    const result = buildForecastBuckets(
      [deal(100_000, 50, "2026-07-10"), deal(50_000, 10, "2026-07-28")],
      NOW,
    );
    expect(result.buckets[0]).toMatchObject({
      totalCents: 150_000,
      weightedCents: 55_000,
      count: 2,
    });
  });
});

describe("winRate", () => {
  it("is null before anything closes", () => {
    expect(winRate(0, 0)).toBeNull();
  });

  it("computes won / (won + lost)", () => {
    expect(winRate(10, 7)).toBeCloseTo(10 / 17);
    expect(winRate(0, 5)).toBe(0);
    expect(winRate(5, 0)).toBe(1);
  });
});

describe("monthKey", () => {
  it("uses UTC so buckets don't shift across timezones", () => {
    expect(monthKey(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
    expect(monthKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });
});
