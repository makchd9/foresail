import "server-only";

import { db } from "@/lib/db";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Fixed-window rate limiter backed by Postgres, so limits hold across
 * serverless instances and cold starts. One atomic upsert per check.
 */
export async function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 15 * 60 * 1000 }: { limit?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  const resetsAt = new Date(Date.now() + windowMs);

  const rows = await db.$queryRaw<Array<{ count: number; resetsAt: Date }>>`
    INSERT INTO "RateLimit" ("key", "count", "resetsAt")
    VALUES (${key}, 1, ${resetsAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetsAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetsAt" = CASE WHEN "RateLimit"."resetsAt" < NOW() THEN ${resetsAt} ELSE "RateLimit"."resetsAt" END
    RETURNING "count", "resetsAt"
  `;

  const row = rows[0];
  if (!row) return { ok: true };

  if (row.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((row.resetsAt.getTime() - Date.now()) / 1000));
    return { ok: false, retryAfterSeconds };
  }
  return { ok: true };
}

export function rateLimitMessage(result: Extract<RateLimitResult, { ok: false }>): string {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
