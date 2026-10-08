import { z } from "zod";

const proposalId = z.uuid("This proposal doesn't exist.");
const revisionId = z.uuid("This item doesn't exist.");

export const submitProposalSchema = z.object({
  projectId: z.uuid("This project doesn't exist."),
  taskIds: z
    .array(z.uuid("This task doesn't exist."))
    .min(1, "Select at least one task.")
    .max(100, "Submit at most 100 tasks at once.")
    .refine((ids) => new Set(ids).size === ids.length, "Each task can be selected once."),
});
export type SubmitProposalInput = z.infer<typeof submitProposalSchema>;

export const withdrawItemsSchema = z.object({
  proposalId,
  revisionIds: z.array(revisionId).min(1, "Choose an item to withdraw."),
});
export type WithdrawItemsInput = z.infer<typeof withdrawItemsSchema>;

export const DECISIONS = ["approved", "rejected", "changes_requested"] as const;
export type Decision = (typeof DECISIONS)[number];

/** The comment given when rejecting or requesting changes; it also lands in the task's thread. */
export const decisionCommentSchema = z.object({
  comment: z.string().trim().min(1, "Write a comment.").max(5000, "Use at most 5,000 characters."),
});
export type DecisionCommentValues = z.infer<typeof decisionCommentSchema>;

export const decideItemSchema = z
  .object({
    proposalId,
    revisionId,
    decision: z.enum(DECISIONS),
    comment: z.string().trim().max(5000, "Use at most 5,000 characters."),
  })
  .superRefine((value, ctx) => {
    if (value.decision !== "approved" && value.comment.length === 0) {
      ctx.addIssue({ code: "custom", path: ["comment"], message: "Write a comment." });
    }
  });
export type DecideItemInput = z.infer<typeof decideItemSchema>;

export const proposalIdSchema = z.object({ proposalId });
export type ProposalIdInput = z.infer<typeof proposalIdSchema>;
