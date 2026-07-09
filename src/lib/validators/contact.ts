import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (value === "" || value === "none" || value == null ? null : value),
  z.string().min(1).max(64).nullable(),
);

const optionalString = (max: number, label: string) =>
  z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().trim().max(max, `Keep ${label} under ${max} characters`).nullable(),
  );

export const contactFormSchema = z.object({
  name: z.string("Name is required").trim().min(1, "Name is required").max(100, "Keep the name under 100 characters"),
  email: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.email("Enter a valid email address").max(254).nullable(),
  ),
  phone: optionalString(30, "phone"),
  title: optionalString(80, "title"),
  companyId: optionalId,
  notes: optionalString(1000, "notes"),
});

export const companyFormSchema = z.object({
  name: z.string("Name is required").trim().min(1, "Name is required").max(100, "Keep the name under 100 characters"),
  domain: z.preprocess(
    (value) => (value === "" || value == null ? null : String(value).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
    z
      .string()
      .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain like acme.com")
      .max(120)
      .nullable(),
  ),
  industry: optionalString(60, "industry"),
  size: optionalString(20, "size"),
  location: optionalString(80, "location"),
  notes: optionalString(1000, "notes"),
});

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
