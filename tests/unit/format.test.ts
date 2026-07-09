import { describe, expect, it } from "vitest";

import { formatCompactMoney, formatMoney, initials } from "@/lib/format";

describe("formatMoney", () => {
  it("hides cents for whole-dollar amounts", () => {
    expect(formatMoney(45_000_00)).toBe("$45,000");
  });

  it("shows cents when they exist", () => {
    expect(formatMoney(1999)).toBe("$19.99");
  });

  it("respects the workspace currency", () => {
    expect(formatMoney(50_000_00, "EUR")).toContain("€");
  });
});

describe("formatCompactMoney", () => {
  // Regression: Intl compact notation renders "$244K" in some ICU builds and
  // "$244.0K" in others, which broke React hydration. Ours must be stable.
  it("never emits trailing .0", () => {
    expect(formatCompactMoney(244_000_00)).toBe("$244K");
    expect(formatCompactMoney(1_000_000_00)).toBe("$1M");
  });

  it("keeps one decimal when meaningful", () => {
    expect(formatCompactMoney(1_250_000_00)).toBe("$1.3M");
    expect(formatCompactMoney(45_500_00)).toBe("$45.5K");
  });

  it("falls back to full formatting under a thousand", () => {
    expect(formatCompactMoney(999_00)).toBe("$999");
  });

  it("handles negatives", () => {
    expect(formatCompactMoney(-45_000_00)).toBe("-$45K");
  });
});

describe("initials", () => {
  it("takes the first letters of the first two words", () => {
    expect(initials("Maya Iyer")).toBe("MI");
    expect(initials("Prisha")).toBe("P");
    expect(initials("Jean claude van damme")).toBe("JC");
  });

  it("never returns an empty string", () => {
    expect(initials("   ")).toBe("?");
  });
});
