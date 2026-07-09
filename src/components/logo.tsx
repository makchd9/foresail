import { cn } from "@/lib/utils";

/** Foresail mark: two sails over a hull. Inherits currentColor. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <path
        d="M17.75 2.5c4.6 4.9 8.2 10.9 9.35 17H17.75V2.5Z"
        fill="currentColor"
      />
      <path
        d="M14.25 7.5c-3.5 3.2-6.4 7.3-7.5 12h7.5v-12Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M3.5 22.5h25l-3.1 4.6a2 2 0 0 1-1.66.9H8.26a2 2 0 0 1-1.66-.9L3.5 22.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className={cn("text-primary", markClassName)} />
      <span>Foresail</span>
    </span>
  );
}
