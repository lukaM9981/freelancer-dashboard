import { z } from "zod";
import { parseRateAmount } from "@/lib/people/rates";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

const fullName = z.string().trim().min(1, "Enter a name.").max(120, "Use at most 120 characters.");

export const roleSchema = z.enum(["admin", "freelancer"]);

export const inviteSchema = z.object({
  email,
  fullName,
  role: roleSchema,
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const invitationIdSchema = z.object({
  invitationId: z.uuid("This invitation doesn't exist."),
});

export const personIdSchema = z.object({
  userId: z.uuid("This person doesn't exist."),
});

export const setRoleSchema = personIdSchema.extend({
  role: roleSchema,
});
export type SetRoleInput = z.infer<typeof setRoleSchema>;

const rateAmount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 45 or 45.50.")
  .refine((value) => {
    try {
      parseRateAmount(value);
      return true;
    } catch {
      return false;
    }
  }, "Enter an amount from 0.01 to 99,999,999.99.");

export const addRateSchema = personIdSchema.extend({
  amount: rateAmount,
  currency: z.enum(["EUR", "USD"], { error: "Choose EUR or USD." }),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date."),
});
export type AddRateInput = z.infer<typeof addRateSchema>;

export const deleteRateSchema = z.object({
  rateId: z.uuid("This rate doesn't exist."),
});

export type InvitationDelivery =
  | { delivered: "email" }
  | { delivered: "link"; inviteUrl: string; reason: "unconfigured" | "failed" };
