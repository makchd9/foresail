import { z } from "zod";

/**
 * Uniform result shape for every server action, so client forms can handle
 * success, top-level errors, and per-field errors the same way everywhere.
 */
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = null>(error: string): ActionResult<T> {
  return { ok: false, error };
}

export function invalid<T = null>(error: z.ZodError): ActionResult<T> {
  const flat = z.flattenError(error);
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: flat.fieldErrors as Record<string, string[] | undefined>,
  };
}
