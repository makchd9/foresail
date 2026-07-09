/** Shared demo logins are protected from takeover and identity changes. */
export const PROTECTED_DEMO_EMAILS = new Set(["demo@foresail.app", "viewer@foresail.app"]);

export function isProtectedDemoEmail(email: string): boolean {
  return PROTECTED_DEMO_EMAILS.has(email.toLowerCase());
}

export const DEMO_WORKSPACE_NOTICE =
  "This shared demo workspace keeps its structure locked so every visitor gets the same tour — create your own workspace to try this.";
