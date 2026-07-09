"use server";

import { hash } from "bcryptjs";
import { headers, cookies } from "next/headers";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { appUrl } from "@/lib/urls";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { isMailConfigured, sendPasswordResetEmail, sendVerificationEmail } from "@/server/email";
import { checkRateLimit, rateLimitMessage } from "@/server/rate-limit";
import { generateToken, hashToken } from "@/server/tokens";
import { ACTIVE_WORKSPACE_COOKIE, createWorkspaceForUser } from "@/server/workspace";

import { PROTECTED_DEMO_EMAILS } from "@/lib/demo";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
}

async function setActiveWorkspaceCookie(workspaceId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

async function issueVerificationLink(userId: string): Promise<string> {
  const { raw, hash: tokenHash } = generateToken();
  await db.verificationToken.deleteMany({ where: { userId } });
  await db.verificationToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return appUrl(`/verify-email?token=${raw}`);
}

// ---------- Sign up ----------

export type SignupResult = { demoVerifyLink: string | null };

export async function signUpAction(
  _prev: ActionResult<SignupResult> | null,
  formData: FormData,
): Promise<ActionResult<SignupResult>> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password } = parsed.data;

  const ip = await clientIp();
  const limit = await checkRateLimit(`signup:${ip}`);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return fail("An account with this email already exists. Try signing in instead.");
  }

  const passwordHash = await hash(password, 12);
  const user = await db.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });

  const firstName = name.split(/\s+/)[0] ?? name;
  const workspace = await createWorkspaceForUser(user.id, `${firstName}'s Workspace`);

  const link = await issueVerificationLink(user.id);
  const mail = await sendVerificationEmail(user.email, user.name, link);

  await signIn("credentials", { email, password, redirect: false });
  await setActiveWorkspaceCookie(workspace.id);

  return ok({ demoVerifyLink: mail.delivered ? null : mail.demoLink });
}

// ---------- Sign in ----------

export type SignInResult = { redirectTo: string };

function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function signInAction(
  _prev: ActionResult<SignInResult> | null,
  formData: FormData,
): Promise<ActionResult<SignInResult>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const limit = await checkRateLimit(`login:${ip}:${email}`);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("Invalid email or password.");
    }
    throw error;
  }

  // Point the session at a workspace the user actually belongs to.
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const store = await cookies();
    const preferred = store.get(ACTIVE_WORKSPACE_COOKIE)?.value;
    const memberships = await db.membership.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
      orderBy: { createdAt: "asc" },
    });
    const valid = memberships.some((m) => m.workspaceId === preferred);
    const fallback = memberships[0]?.workspaceId;
    if (!valid && fallback) await setActiveWorkspaceCookie(fallback);
  }

  const from = safeInternalPath(formData.get("from"));
  return ok({ redirectTo: from ?? "/app" });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
}

// ---------- Email verification ----------

export type ResendVerificationResult = { demoVerifyLink: string | null };

export async function resendVerificationAction(): Promise<ActionResult<ResendVerificationResult>> {
  const user = await getCurrentUser();
  if (!user) return fail("Your session has expired. Sign in again.");
  if (user.emailVerified) return ok({ demoVerifyLink: null });

  const limit = await checkRateLimit(`verify:${user.id}`, { limit: 3 });
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const link = await issueVerificationLink(user.id);
  const mail = await sendVerificationEmail(user.email, user.name, link);
  return ok({ demoVerifyLink: mail.delivered ? null : mail.demoLink });
}

export type VerifyEmailStatus = "verified" | "already" | "invalid" | "expired";

/** Consumes a raw verification token. Single-use: all tokens are deleted on success. */
export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailStatus> {
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: { select: { id: true, emailVerified: true } } },
  });
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  if (record.user.emailVerified) {
    await db.verificationToken.deleteMany({ where: { userId: record.userId } });
    return "already";
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    db.verificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  return "verified";
}

// ---------- Password reset ----------

export type RequestResetResult = { mailConfigured: boolean };

export async function requestPasswordResetAction(
  _prev: ActionResult<RequestResetResult> | null,
  formData: FormData,
): Promise<ActionResult<RequestResetResult>> {
  const parsed = requestPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email } = parsed.data;

  const ip = await clientIp();
  const limit = await checkRateLimit(`pwreset:${ip}`);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  // Without an email provider we refuse to mint reset links: showing them
  // on-screen would let anyone take over any account by typing its email.
  if (!isMailConfigured()) {
    return ok({ mailConfigured: false });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  // Same response whether or not the account exists — no enumeration.
  if (user && !PROTECTED_DEMO_EMAILS.has(user.email)) {
    const { raw, hash: tokenHash } = generateToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    await sendPasswordResetEmail(user.email, user.name, appUrl(`/reset-password?token=${raw}`));
  }
  return ok({ mailConfigured: true });
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { token, password } = parsed.data;

  const ip = await clientIp();
  const limit = await checkRateLimit(`pwreset-confirm:${ip}`);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("This reset link is invalid or has expired. Request a new one.");
  }
  if (PROTECTED_DEMO_EMAILS.has(record.user.email)) {
    return fail("The shared demo account's password can't be changed.");
  }

  const passwordHash = await hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);
  return ok(null);
}
