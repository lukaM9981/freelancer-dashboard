import { z } from "zod";

const ESTIMATE_STEP = 15;

const taskId = z.uuid("This task doesn't exist.");

export const taskIdSchema = z.object({ taskId });
export type TaskIdInput = z.infer<typeof taskIdSchema>;

const title = z.string().trim().min(1, "Enter a title.").max(200, "Use at most 200 characters.");
const description = z.string().trim().max(5000, "Use at most 5,000 characters.");

/** Minutes from a DurationInput: null when empty, NaN when it can't be read. */
const estimateMinutes = z
  .number({ error: "Enter a duration like 1h 30m." })
  .int("Enter a duration like 1h 30m.")
  .positive("Use at least 15 minutes.")
  .multipleOf(ESTIMATE_STEP, "Use 15-minute steps.")
  .nullable();

/**
 * An estimate is a range of hours in 15-minute steps, both above zero, the minimum not
 * above the maximum (PRD §5.2). Leaving both empty means "no estimate yet".
 */
const estimateShape = {
  estimateMin: estimateMinutes,
  estimateMax: estimateMinutes,
  estimateNote: z.string().trim().max(2000, "Use at most 2,000 characters."),
};

function checkEstimate(
  value: { estimateMin: number | null; estimateMax: number | null },
  ctx: z.RefinementCtx,
) {
  const { estimateMin: min, estimateMax: max } = value;
  if (min == null && max != null) {
    ctx.addIssue({ code: "custom", path: ["estimateMin"], message: "Enter a minimum too." });
  }
  if (max == null && min != null) {
    ctx.addIssue({ code: "custom", path: ["estimateMax"], message: "Enter a maximum too." });
  }
  if (min != null && max != null && min > max) {
    ctx.addIssue({
      code: "custom",
      path: ["estimateMax"],
      message: "The maximum can't be below the minimum.",
    });
  }
}

export const UNASSIGNED = "unassigned";

/** The task editor's fields; the assignee is a select value, `UNASSIGNED` for nobody. */
export const taskFormSchema = z
  .object({
    title,
    description,
    assignee: z.string(),
    ...estimateShape,
  })
  .superRefine(checkEstimate);
export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const createTaskSchema = z
  .object({
    projectId: z.uuid("This project doesn't exist."),
    title,
    description,
    /** Admins only; freelancers always create tasks for themselves. */
    assigneeId: z.uuid("Choose a person.").nullable(),
    ...estimateShape,
  })
  .superRefine(checkEstimate);
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    taskId,
    title,
    description,
    /** Undefined leaves the assignee alone. */
    assigneeId: z.uuid("Choose a person.").nullable().optional(),
    ...estimateShape,
  })
  .superRefine(checkEstimate);
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

const commentBody = z
  .string()
  .trim()
  .min(1, "Write a comment.")
  .max(5000, "Use at most 5,000 characters.");

export const addCommentSchema = z.object({ taskId, body: commentBody });
export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const editCommentSchema = z.object({
  taskId,
  commentId: z.uuid("This comment doesn't exist."),
  body: commentBody,
});
export type EditCommentInput = z.infer<typeof editCommentSchema>;

export const deleteCommentSchema = z.object({ taskId, commentId: z.uuid("This comment doesn't exist.") });
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

export const addLinkSchema = z.object({
  taskId,
  url: z
    .string()
    .trim()
    .min(1, "Enter a web address.")
    .max(2000, "Use at most 2,000 characters.")
    .regex(/^https?:\/\/\S+$/i, "Enter a full address starting with https://."),
  label: z.string().trim().max(120, "Use at most 120 characters."),
});
export type AddLinkInput = z.infer<typeof addLinkSchema>;

export const removeLinkSchema = z.object({ taskId, linkId: z.uuid("This link doesn't exist.") });
export type RemoveLinkInput = z.infer<typeof removeLinkSchema>;
