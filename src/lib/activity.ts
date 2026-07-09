/** Human-readable rendering rules for audit-log actions. */

export type ActivityMeta = {
  from?: string;
  to?: string;
  stage?: string;
  role?: string;
  sample?: boolean;
} | null;

export function activityPhrase(action: string, meta: ActivityMeta): string {
  switch (action) {
    case "deal.created":
      return meta?.stage ? `created this deal in ${meta.stage}` : "created deal";
    case "deal.updated":
      return "updated deal";
    case "deal.stage_changed":
      return meta?.from && meta?.to ? `moved deal from ${meta.from} to ${meta.to}` : "moved deal";
    case "deal.won":
      return "marked deal as won";
    case "deal.lost":
      return "marked deal as lost";
    case "deal.deleted":
      return "deleted deal";
    case "deal.restored":
      return "restored deal";
    case "note.created":
      return "added a note to";
    case "contact.created":
      return "added contact";
    case "contact.updated":
      return "updated contact";
    case "contact.deleted":
      return "deleted contact";
    case "company.created":
      return "added company";
    case "company.updated":
      return "updated company";
    case "company.deleted":
      return "deleted company";
    case "stage.updated":
      return "updated stage";
    case "member.invited":
      return "created an invite link for";
    case "member.joined":
      return "joined";
    case "member.role_changed":
      return meta?.role ? `changed role to ${meta.role} for` : "changed role of";
    case "member.removed":
      return "removed member";
    case "workspace.updated":
      return "updated workspace settings for";
    default:
      return action.replace(".", " ");
  }
}

export const ENTITY_TYPES = ["deal", "contact", "company", "stage", "member", "workspace"] as const;
