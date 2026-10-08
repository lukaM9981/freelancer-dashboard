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

const workDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const minutes = z
  .number({ error: "Enter a duration like 1h 30m." })
  .int("Enter a whole number of minutes.")
  .min(1, "Enter at least 1 minute.")
  .max(24 * 60, "One day can't hold more than 24 hours.");

export const addTimeEntrySchema = z.object({
  taskId: z.uuid("This task doesn't exist."),
  workDate,
  minutes,
  description,
});
export type AddTimeEntryInput = z.infer<typeof addTimeEntrySchema>;

export const updateManualEntrySchema = z.object({
  entryId: z.uuid("This time entry doesn't exist."),
  workDate,
  minutes,
  description,
});
export type UpdateManualEntryInput = z.infer<typeof updateManualEntrySchema>;

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Enter a valid time.");

export const updateTimedEntrySchema = z.object({
  entryId: z.uuid("This time entry doesn't exist."),
  workDate,
  startTime: clock,
  endTime: clock,
  endsAtMidnight: z.boolean(),
  description,
  startedAt: timestamp,
  endedAt: timestamp,
});
export type UpdateTimedEntryInput = z.infer<typeof updateTimedEntrySchema>;

export const deleteTimeEntrySchema = z.object({
  entryId: z.uuid("This time entry doesn't exist."),
});
export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;
