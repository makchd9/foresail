import { describe, expect, it } from "vitest";

import { emailSchema, signupSchema } from "@/lib/validators/auth";
import { dealFormSchema, dollarsToCents, moveDealSchema } from "@/lib/validators/deal";

describe("emailSchema", () => {
  it("normalizes case and whitespace", () => {
    expect(emailSchema.parse("  Demo@Foresail.APP ")).toBe("demo@foresail.app");
  });

  it("rejects non-emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("requires an 8+ character password", () => {
    const result = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid signup", () => {
    const result = signupSchema.safeParse({
      name: "  Ada Lovelace ",
      email: "ADA@example.com",
      password: "correct-horse",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ada Lovelace");
      expect(result.data.email).toBe("ada@example.com");
    }
  });
});

describe("dealFormSchema money parsing", () => {
  const base = { title: "Deal", stageId: "stage_1" };

  it("accepts human-formatted amounts", () => {
    const result = dealFormSchema.safeParse({ ...base, value: "25,000" });
    expect(result.success).toBe(true);
    if (result.success) expect(dollarsToCents(result.data.value)).toBe(2_500_000);
  });

  it("accepts a leading dollar sign and decimals", () => {
    const result = dealFormSchema.safeParse({ ...base, value: "$1,234.56" });
    expect(result.success).toBe(true);
    if (result.success) expect(dollarsToCents(result.data.value)).toBe(123_456);
  });

  it("rejects negatives and absurd amounts", () => {
    expect(dealFormSchema.safeParse({ ...base, value: "-5" }).success).toBe(false);
    expect(dealFormSchema.safeParse({ ...base, value: "999999999" }).success).toBe(false);
  });

  it("treats empty selects as null relations", () => {
    const result = dealFormSchema.safeParse({
      ...base,
      value: "100",
      companyId: "none",
      contactId: "",
      ownerId: undefined,
      expectedCloseDate: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyId).toBeNull();
      expect(result.data.contactId).toBeNull();
      expect(result.data.expectedCloseDate).toBeNull();
    }
  });
});

describe("moveDealSchema", () => {
  it("requires deal and stage ids", () => {
    expect(moveDealSchema.safeParse({ dealId: "", stageId: "s" }).success).toBe(false);
    expect(
      moveDealSchema.safeParse({ dealId: "d", stageId: "s", prevDealId: null, nextDealId: null })
        .success,
    ).toBe(true);
  });
});
