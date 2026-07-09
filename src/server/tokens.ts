import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** Generate an opaque URL-safe token. Only its SHA-256 hash is stored at rest. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
