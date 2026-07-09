import { describe, expect, it } from "vitest";

import { ASSIGNABLE_ROLES, hasRole, ROLE_RANK, type Role } from "@/lib/rbac";

describe("hasRole", () => {
  const roles = Object.keys(ROLE_RANK) as Role[];

  it("owner clears every gate", () => {
    for (const minimum of roles) {
      expect(hasRole("OWNER", minimum)).toBe(true);
    }
  });

  it("viewer only clears the viewer gate", () => {
    expect(hasRole("VIEWER", "VIEWER")).toBe(true);
    expect(hasRole("VIEWER", "MEMBER")).toBe(false);
    expect(hasRole("VIEWER", "ADMIN")).toBe(false);
    expect(hasRole("VIEWER", "OWNER")).toBe(false);
  });

  it("member can write but not administer", () => {
    expect(hasRole("MEMBER", "MEMBER")).toBe(true);
    expect(hasRole("MEMBER", "ADMIN")).toBe(false);
  });

  it("admin administers but does not own", () => {
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "OWNER")).toBe(false);
  });
});

describe("ASSIGNABLE_ROLES", () => {
  it("never includes OWNER — ownership isn't grantable via role menus", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("OWNER");
  });
});
