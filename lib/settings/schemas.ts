import { z } from "zod";

export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter the organization name.")
    .max(120, "Use at most 120 characters."),
  timeZone: z.string().trim().min(1, "Choose a time zone from the list."),
  tolerancePercent: z
    .number("Use a whole number from 0 to 100.")
    .int("Use a whole number from 0 to 100.")
    .min(0, "Use a whole number from 0 to 100.")
    .max(100, "Use a whole number from 0 to 100."),
  defaultCurrency: z.enum(["EUR", "USD"], { error: "Choose EUR or USD." }),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
