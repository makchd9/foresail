/**
 * Formatting helpers. Date-only values format in UTC with a fixed locale so
 * server and client render identical strings (no hydration drift).
 */

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function currencySymbol(currency: string): string {
  const part = new Intl.NumberFormat("en-US", { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? "$";
}

function trimmedFixed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Compact money for KPIs and card chips: $1.2M, $48K.
 * Hand-rolled instead of Intl `notation: "compact"` because ICU versions
 * disagree on trailing zeros ("$244K" vs "$244.0K"), which breaks hydration.
 */
export function formatCompactMoney(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  const symbol = currencySymbol(currency);
  if (abs >= 1_000_000_000) return `${sign}${symbol}${trimmedFixed(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${symbol}${trimmedFixed(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${trimmedFixed(abs / 1_000)}K`;
  return formatMoney(cents, currency);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: true,
  }).format(date);
}

const DAY = 24 * 60 * 60 * 1000;

/** Whole-day relative label for feeds: "today", "3d ago", "2mo ago". */
export function relativeDays(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Days until a date; negative = overdue. */
export function daysUntil(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.ceil((date.getTime() - Date.now()) / DAY);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Deterministic accent index for avatar tinting. */
export function nameHue(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}
