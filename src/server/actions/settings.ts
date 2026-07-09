"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isProtectedDemoEmail } from "@/lib/demo";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { changePasswordSchema, profileSchema } from "@/lib/validators/settings";
import { checkRateLimit, rateLimitMessage } from "@/server/rate-limit";

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");
  if (isProtectedDemoEmail(user.email)) {
    return fail("The shared demo account's profile can't be changed.");
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/app", "layout");
  return ok(null);
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");
  if (isProtectedDemoEmail(user.email)) {
    return fail("The shared demo account's password can't be changed.");
  }

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const limit = await checkRateLimit(`pwchange:${user.id}`);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return fail("Account not found.");

  const valid = await compare(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return fail("Your current password is incorrect.");

  const passwordHash = await hash(parsed.data.password, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return ok(null);
}
