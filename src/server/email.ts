import "server-only";

import { Resend } from "resend";

/**
 * Transactional email with an honest fallback: when RESEND_API_KEY is not set
 * (e.g. the public demo deployment), the action returns the link so the UI can
 * present it on-screen instead. The flow itself — hashed single-use tokens,
 * expiry, server-side verification — is identical either way.
 */

export type MailResult = { delivered: true } | { delivered: false; demoLink: string };

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

async function send(to: string, subject: string, html: string, fallbackLink: string): Promise<MailResult> {
  if (!isMailConfigured()) {
    return { delivered: false, demoLink: fallbackLink };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject,
    html,
  });
  return { delivered: true };
}

export async function sendVerificationEmail(to: string, name: string, link: string): Promise<MailResult> {
  return send(
    to,
    "Verify your email — Foresail",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Confirm your email address to unlock editing in Foresail:</p>
     <p><a href="${link}">Verify my email</a></p>
     <p>This link expires in 24 hours. If you didn't create a Foresail account, you can ignore this email.</p>`,
    link,
  );
}

export async function sendPasswordResetEmail(to: string, name: string, link: string): Promise<MailResult> {
  return send(
    to,
    "Reset your password — Foresail",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>We received a request to reset your Foresail password:</p>
     <p><a href="${link}">Choose a new password</a></p>
     <p>This link expires in 30 minutes and can be used once. If this wasn't you, no action is needed.</p>`,
    link,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
