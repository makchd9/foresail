import { z } from "zod";

/** One shared schema per boundary: the browser and the API reject identical input. */

export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Enter a valid email address").max(254, "Email is too long"),
);

export const passwordSchema = z
  .string("Password is required")
  .min(8, "Use at least 8 characters")
  .max(100, "Password is too long");

export const signupSchema = z.object({
  name: z.string("Name is required").trim().min(1, "Name is required").max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string("Password is required").min(1, "Password is required").max(100),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset link is invalid"),
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
