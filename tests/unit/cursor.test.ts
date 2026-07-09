import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor, keysetWhere } from "@/server/queries/cursor";

describe("cursor codec", () => {
  it("round-trips dates with full precision", () => {
    const date = new Date("2026-07-09T13:45:12.345Z");
    const decoded = decodeCursor(encodeCursor(date, "abc123"));
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe("abc123");
    expect((decoded?.value as Date).toISOString()).toBe(date.toISOString());
  });

  it("round-trips numbers and strings", () => {
    expect(decodeCursor(encodeCursor(4_500_00, "d1"))).toEqual({ value: 4_500_00, id: "d1" });
    expect(decodeCursor(encodeCursor("Aster Health", "d2"))).toEqual({
      value: "Aster Health",
      id: "d2",
    });
  });

  it("returns null for garbage instead of throwing", () => {
    expect(decodeCursor("not-base64url!!")).toBeNull();
    expect(decodeCursor(Buffer.from("[1,2,3]").toString("base64url"))).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });
});

describe("keysetWhere", () => {
  const cursor = { value: 100, id: "deal_5" };

  it("moves forward in a descending sort with lt", () => {
    expect(keysetWhere("valueCents", "desc", cursor, true)).toEqual({
      OR: [
        { valueCents: { lt: 100 } },
        { AND: [{ valueCents: 100 }, { id: { lt: "deal_5" } }] },
      ],
    });
  });

  it("moves forward in an ascending sort with gt", () => {
    expect(keysetWhere("name", "asc", { value: "M", id: "c1" }, true)).toEqual({
      OR: [{ name: { gt: "M" } }, { AND: [{ name: "M" }, { id: { gt: "c1" } }] }],
    });
  });

  it("inverts the comparison when paginating backwards", () => {
    expect(keysetWhere("valueCents", "desc", cursor, false)).toEqual({
      OR: [
        { valueCents: { gt: 100 } },
        { AND: [{ valueCents: 100 }, { id: { gt: "deal_5" } }] },
      ],
    });
  });
});
