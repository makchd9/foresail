/**
 * Stage color tokens. Tailwind can't build dynamic class names, so every
 * stage color maps to fixed classes plus a hex used by charts.
 */

export type StageColorClasses = {
  dot: string;
  badge: string;
  hex: string;
};

export const STAGE_COLOR_CLASSES: Record<string, StageColorClasses> = {
  zinc: {
    dot: "bg-zinc-400 dark:bg-zinc-500",
    badge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    hex: "#71717a",
  },
  sky: {
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    hex: "#0ea5e9",
  },
  blue: {
    dot: "bg-blue-500",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    hex: "#3b82f6",
  },
  violet: {
    dot: "bg-violet-500",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    hex: "#8b5cf6",
  },
  fuchsia: {
    dot: "bg-fuchsia-500",
    badge: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    hex: "#d946ef",
  },
  amber: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hex: "#f59e0b",
  },
  emerald: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    hex: "#10b981",
  },
  rose: {
    dot: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    hex: "#f43f5e",
  },
};

export function stageColor(name: string): StageColorClasses {
  return STAGE_COLOR_CLASSES[name] ?? STAGE_COLOR_CLASSES["zinc"]!;
}
