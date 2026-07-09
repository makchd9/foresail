import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
};

/** Resolve the signed-in user from the session JWT, deduped per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
});

/** Gate for authenticated pages and actions. Redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
