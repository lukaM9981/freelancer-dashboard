import { z } from "zod";

const monthStart = z.string().regex(/^\d{4}-\d{2}-01$/, "Choose a month.");

export const closeMonthSchema = z.object({ month: monthStart });
export type CloseMonthInput = z.infer<typeof closeMonthSchema>;

export const reopenMonthSchema = z.object({
  month: monthStart,
  reason: z
    .string()
    .trim()
    .min(1, "Write a reason. It's required to reopen a month.")
    .max(2000, "Use at most 2,000 characters."),
});
export type ReopenMonthInput = z.infer<typeof reopenMonthSchema>;

export const reopenReasonSchema = reopenMonthSchema.omit({ month: true });
export type ReopenReasonValues = z.infer<typeof reopenReasonSchema>;
