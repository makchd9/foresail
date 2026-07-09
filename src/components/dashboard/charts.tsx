"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ForecastBucket, StageSlice } from "@/server/queries/dashboard";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { stageColor } from "@/lib/stage-colors";

type ValueTooltipPayload = {
  totalCents?: number;
  weightedCents?: number;
  count?: number;
  name?: string;
  label?: string;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ValueTooltipPayload | undefined;
  if (!data) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{data.name ?? data.label}</p>
      {typeof data.weightedCents === "number" ? (
        <p className="text-muted-foreground">
          Weighted: <span className="font-mono font-medium text-popover-foreground">{formatMoney(data.weightedCents)}</span>
        </p>
      ) : null}
      {typeof data.totalCents === "number" ? (
        <p className="text-muted-foreground">
          Total: <span className="font-mono font-medium text-popover-foreground">{formatMoney(data.totalCents)}</span>
        </p>
      ) : null}
      {typeof data.count === "number" ? (
        <p className="text-muted-foreground">
          {data.count} deal{data.count === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

export function PipelineByStageChart({ data }: { data: StageSlice[] }) {
  const chartData = data.map((slice) => ({
    ...slice,
    name: slice.name,
    total: slice.totalCents / 100,
  }));

  return (
    <div className="h-64" role="img" aria-label={`Open pipeline by stage: ${data.map((s) => `${s.name} ${formatCompactMoney(s.totalCents)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => formatCompactMoney(value * 100)}
          />
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
            {chartData.map((entry) => (
              <Cell key={entry.stageId} fill={stageColor(entry.color).hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ data }: { data: ForecastBucket[] }) {
  const chartData = data.map((bucket) => ({
    ...bucket,
    weighted: bucket.weightedCents / 100,
  }));

  return (
    <div className="h-64" role="img" aria-label={`Weighted forecast by month: ${data.map((b) => `${b.label} ${formatCompactMoney(b.weightedCents)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => formatCompactMoney(value * 100)}
          />
          <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="weighted"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#forecastFill)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
