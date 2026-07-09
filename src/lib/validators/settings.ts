import { z } from "zod";

import { STAGE_COLORS } from "@/lib/stages";
import { passwordSchema } from "@/lib/validators/auth";

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "SGD"] as const;

export const profileSchema = z.object({
  name: z.string("Name is required").trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string("Enter your current password").min(1, "Enter your current password").max(100),
  password: passwordSchema,
});

export const workspaceSettingsSchema = z.object({
  name: z.string("Workspace name is required").trim().min(1, "Workspace name is required").max(60, "Keep it under 60 characters"),
  currency: z.enum(CURRENCIES, "Pick a currency"),
});

export const stageSchema = z.object({
  name: z.string("Stage name is required").trim().min(1, "Stage name is required").max(40, "Keep it under 40 characters"),
  probability: z.coerce
    .number("Probability must be a number")
    .int("Whole numbers only")
    .min(0, "0 is the minimum")
    .max(100, "100 is the maximum"),
  color: z.enum(STAGE_COLORS, "Pick a color"),
});

export const inviteRoleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"], "Pick a role");
