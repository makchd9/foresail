"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** URL-synced filter dropdown; filters combine with AND semantics server-side. */
export function FilterSelect({
  paramKey,
  options,
  allLabel,
  ariaLabel,
}: {
  paramKey: string;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramKey) ?? "all";

  const items = [{ value: "all", label: allLabel }, ...options];

  function handleChange(value: unknown) {
    const next = (value as string) ?? "all";
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete(paramKey);
    else params.set(paramKey, next);
    params.delete("after");
    params.delete("before");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  return (
    <Select value={current} onValueChange={handleChange} items={items}>
      <SelectTrigger size="sm" aria-label={ariaLabel} className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
