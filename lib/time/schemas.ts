import { z } from "zod";

const description = z
  .string()
  .trim()
  .min(1, "Describe the work you did.")
  .max(2000, "Use at most 2,000 characters.");

export const startTimerSchema = z.object({ taskId: z.uuid("This task doesn't exist.") });
export type StartTimerInput = z.infer<typeof startTimerSchema>;

export const stopTimerSchema = z
  .object({
    startedAt: z.iso.datetime({ offset: true, message: "Enter a valid start time." }),
    endedAt: z.iso.datetime({ offset: true, message: "Enter a valid end time." }),
    description,
  })
  .refine((value) => Date.parse(value.endedAt) > Date.parse(value.startedAt), {
    path: ["endTime"],
    message: "The end must be after the start.",
  });
export type StopTimerInput = z.infer<typeof stopTimerSchema>;

/** The review dialog. Start and end are checked against the real run by `resolveRun`. */
export const timerReviewSchema = z.object({
  startDate: z.string(),
  startTime: z.string().min(1, "Enter the start time."),
  endDate: z.string(),
  endTime: z.string().min(1, "Enter the end time."),
  description,
  confirmEnd: z.boolean(),
});
export type TimerReviewValues = z.infer<typeof timerReviewSchema>;

export const entryDescriptionSchema = z.object({
  entryId: z.uuid("This time entry doesn't exist."),
  description,
});
export type EntryDescriptionInput = z.infer<typeof entryDescriptionSchema>;
