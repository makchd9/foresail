import { z } from "zod";

const id = z.string().min(1).max(64);

/** "" / "none" from selects → null, so forms and API share one schema. */
const optionalId = z.preprocess(
  (value) => (value === "" || value === "none" || value == null ? null : value),
  id.nullable(),
);

const optionalDate = z.preprocess(
  (value) => (value === "" || value == null ? null : value),
  z.coerce.date("Enter a valid date").nullable(),
);

/** Money arrives as dollars (string from the form), stored as integer cents. */
export const moneyInput = z.preprocess(
  (value) => (typeof value === "string" ? value.replaceAll(",", "").replace(/^\$/, "").trim() : value),
  z.coerce
    .number("Enter a valid amount")
    .min(0, "Amount can't be negative")
    .max(20_000_000, "Amounts above $20M aren't supported"),
);

export const dealFormSchema = z.object({
  title: z.string("Give the deal a title").trim().min(1, "Give the deal a title").max(140, "Keep the title under 140 characters"),
  value: moneyInput,
  stageId: id,
  companyId: optionalId,
  contactId: optionalId,
  ownerId: optionalId,
  expectedCloseDate: optionalDate,
});

export const dealUpdateSchema = dealFormSchema.extend({
  lostReason: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().max(200, "Keep it under 200 characters").nullable(),
  ),
});

export const moveDealSchema = z.object({
  dealId: id,
  stageId: id,
  prevDealId: optionalId,
  nextDealId: optionalId,
});

export const noteFormSchema = z.object({
  dealId: id,
  body: z.string("Write something first").trim().min(1, "Write something first").max(2000, "Keep notes under 2000 characters"),
});

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export type DealFormInput = z.infer<typeof dealFormSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;
