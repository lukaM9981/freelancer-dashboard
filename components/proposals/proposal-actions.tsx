"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyFieldErrors } from "@/lib/forms";
import { approveAllRemaining, decideItem, submitProposal, withdrawItems } from "@/lib/proposals/actions";
import { type DecisionCommentValues, decisionCommentSchema } from "@/lib/proposals/schemas";

type CommentedDecision = "rejected" | "changes_requested";

const commentDialogs: Record<CommentedDecision, { title: string; description: string; action: string }> = {
  changes_requested: {
    title: "Request changes",
    description:
      "The task goes back to the freelancer to revise and resubmit. Your comment appears in the task's comment thread.",
    action: "Request Changes",
  },
  rejected: {
    title: "Reject this estimate",
    description:
      "Rejecting is final: the task can't be resubmitted. If the work is still wanted, create a new task. Your reason appears in the task's comment thread.",
    action: "Reject",
  },
};

export function ItemDecisionButtons({
  proposalId,
  revisionId,
  taskTitle,
}: {
  proposalId: string;
  revisionId: string;
  taskTitle: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<CommentedDecision | null>(null);

  async function approve() {
    setPending(true);
    const result = await decideItem({ proposalId, revisionId, decision: "approved", comment: "" });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Approved \u201c${taskTitle}\u201d.`);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <IconAction label="Approve" disabled={pending} onClick={approve}>
        <CheckIcon />
      </IconAction>
      <IconAction label="Request changes" disabled={pending} onClick={() => setDialog("changes_requested")}>
        <RotateCcwIcon />
      </IconAction>
      <IconAction label="Reject" disabled={pending} onClick={() => setDialog("rejected")}>
        <XIcon />
      </IconAction>
      <Dialog open={dialog != null} onOpenChange={(open) => (open ? null : setDialog(null))}>
        <DialogContent>
          {dialog ? (
            <CommentForm
              key={dialog}
              decision={dialog}
              proposalId={proposalId}
              revisionId={revisionId}
              taskTitle={taskTitle}
              onCancel={() => setDialog(null)}
              onDone={() => {
                setDialog(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-11 sm:size-8"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function CommentForm({
  decision,
  proposalId,
  revisionId,
  taskTitle,
  onCancel,
  onDone,
}: {
  decision: CommentedDecision;
  proposalId: string;
  revisionId: string;
  taskTitle: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const copy = commentDialogs[decision];
  const form = useForm<DecisionCommentValues>({
    resolver: zodResolver(decisionCommentSchema),
    defaultValues: { comment: "" },
  });

  async function onSubmit(values: DecisionCommentValues) {
    const result = await decideItem({ proposalId, revisionId, decision, comment: values.comment });
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success(
      decision === "rejected" ? `Rejected \u201c${taskTitle}\u201d.` : `Changes requested on \u201c${taskTitle}\u201d.`,
    );
    onDone();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{taskTitle}</span>. {copy.description}
        </DialogDescription>
      </DialogHeader>
      <TextareaField
        control={form.control}
        name="comment"
        id={`decision-${revisionId}`}
        label={decision === "rejected" ? "Reason" : "What should change"}
        autoFocus
      />
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <SubmitButton
          variant={decision === "rejected" ? "destructive" : "secondary"}
          pending={form.formState.isSubmitting}
        >
          {copy.action}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function ApproveAllButton({ proposalId, count }: { proposalId: string; count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function approveAll() {
    setPending(true);
    const result = await approveAllRemaining({ proposalId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success(count === 1 ? "Item approved." : `${count} items approved.`);
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Approve All Remaining
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{count === 1 ? "Approve the remaining item?" : `Approve all ${count} remaining items?`}</DialogTitle>
            <DialogDescription>
              Each estimate is approved as submitted and work can start. A decision is final.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton type="button" pending={pending} onClick={approveAll}>
              Approve All
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WithdrawButton({
  proposalId,
  revisionIds,
  label,
  size = "default",
}: {
  proposalId: string;
  revisionIds: string[];
  label: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const many = revisionIds.length > 1;

  async function withdraw() {
    setPending(true);
    const result = await withdrawItems({ proposalId, revisionIds });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success(many ? `${revisionIds.length} items withdrawn.` : "Withdrawn. The task is a draft again.");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{many ? `Withdraw ${revisionIds.length} items?` : "Withdraw this estimate?"}</DialogTitle>
            <DialogDescription>
              {many ? "The tasks go" : "The task goes"} back to Draft, so you can change the estimate and
              submit again. The withdrawn estimate stays in the history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton type="button" variant="secondary" pending={pending} onClick={withdraw}>
              Withdraw
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Submitting one task from its detail page makes a proposal with one item (PRD §5.3). */
export function SubmitTaskButton({ projectId, taskId }: { projectId: string; taskId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    const result = await submitProposal({ projectId, taskIds: [taskId] });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Submitted for approval.");
    router.refresh();
  }

  return (
    <SubmitButton type="button" pending={pending} onClick={submit}>
      Submit
    </SubmitButton>
  );
}
