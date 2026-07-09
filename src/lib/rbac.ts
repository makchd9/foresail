/**
 * Role-based access control, kept dependency-free so it can be unit-tested
 * and imported from client components (for showing/hiding affordances).
 * The server re-checks every mutation regardless of what the UI shows.
 */

export const ROLE_RANK = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
} as const;

export type Role = keyof typeof ROLE_RANK;

export const ROLES: readonly Role[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: "Full control, including deleting the workspace",
  ADMIN: "Manage members, stages, and all records",
  MEMBER: "Create and edit deals, contacts, and companies",
  VIEWER: "Read-only access to everything",
};

/** Roles an admin/owner can assign to others (ownership transfers are separate). */
export const ASSIGNABLE_ROLES: readonly Role[] = ["ADMIN", "MEMBER", "VIEWER"];
