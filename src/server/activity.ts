import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type ActivityInput = {
  workspaceId: string;
  actorId: string | null;
  action: string;
  entityType: "deal" | "contact" | "company" | "stage" | "member" | "workspace" | "note";
  entityId?: string | null;
  entityLabel: string;
  meta?: Prisma.InputJsonValue;
};

type Writer = Pick<typeof db, "activityLog"> | Prisma.TransactionClient;

/** Append-only audit trail. Pass a transaction client to log atomically with the mutation. */
export async function logActivity(input: ActivityInput, writer: Writer = db): Promise<void> {
  await writer.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel,
      meta: input.meta,
    },
  });
}
