"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addComment, deleteComment, editComment } from "@/lib/tasks/actions";
import { addCommentSchema } from "@/lib/tasks/schemas";

export type CommentView = {
  id: string;
  authorName: string;
  kind: "comment" | "decision";
  body: string;
  createdLabel: string;
  edited: boolean;
  canChange: boolean;
};

const bodySchema = addCommentSchema.pick({ body: true });
type BodyValues = z.infer<typeof bodySchema>;

type CommentsSectionProps = {
  taskId: string;
  comments: CommentView[];
  canComment: boolean;
};

export function CommentsSection({ taskId, comments, canComment }: CommentsSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CommentView | null>(null);
  const [pending, setPending] = useState(false);

  async function remove(comment: CommentView) {
    setPending(true);
    const result = await deleteComment({ taskId, commentId: comment.id });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDeleting(null);
    toast.success("Comment deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {comments.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ol className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-body-sm font-bold">{comment.authorName}</span>
                <span className="font-mono text-caption text-muted-foreground">{comment.createdLabel}</span>
                {comment.edited ? <span className="text-caption text-muted-foreground">Edited</span> : null}
                {comment.kind === "decision" ? <Badge variant="outline">Decision</Badge> : null}
              </div>
              {editing === comment.id ? (
                <EditCommentForm
                  taskId={taskId}
                  comment={comment}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <p className="mt-2 whitespace-pre-line break-words text-body-sm">{comment.body}</p>
                  {comment.canChange ? (
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(comment.id)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(comment)}>
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {canComment ? <AddCommentForm taskId={taskId} /> : null}

      <Dialog open={deleting != null} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <DialogContent>
          {deleting ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete this comment?</DialogTitle>
                <DialogDescription>
                  It disappears from the thread. The task history keeps a record that it was deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
                <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => remove(deleting)}>
                  Delete Comment
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddCommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const form = useForm<BodyValues>({ resolver: zodResolver(bodySchema), defaultValues: { body: "" } });

  async function onSubmit(values: BodyValues) {
    const result = await addComment({ taskId, body: values.body });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    form.reset({ body: "" });
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <TextareaField control={form.control} name="body" id="new-comment" label="Add a comment" />
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
        <SubmitButton variant="secondary" pending={form.formState.isSubmitting}>
          Post Comment
        </SubmitButton>
      </div>
    </form>
  );
}

function EditCommentForm({
  taskId,
  comment,
  onDone,
}: {
  taskId: string;
  comment: CommentView;
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<BodyValues>({ resolver: zodResolver(bodySchema), defaultValues: { body: comment.body } });

  async function onSubmit(values: BodyValues) {
    const result = await editComment({ taskId, commentId: comment.id, body: values.body });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Comment saved.");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-3">
      <TextareaField control={form.control} name="body" id={`comment-${comment.id}`} label="Comment" autoFocus />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton variant="secondary" size="sm" pending={form.formState.isSubmitting}>
          Save Comment
        </SubmitButton>
      </div>
    </form>
  );
}
