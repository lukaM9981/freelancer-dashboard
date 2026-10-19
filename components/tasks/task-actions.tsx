"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DurationInput } from "@/components/duration-input";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimer } from "@/components/timer/timer-provider";
import type { ActionResult } from "@/lib/db/result";
import { applyFieldErrors } from "@/lib/forms";
import { formatDuration } from "@/lib/format";
import {
  acceptTask,
  cancelTask,
  decideExtraHours,
  holdTask,
  markTaskDone,
  reassignTask,
  requestExtraHours,
  resumeTask,
  returnTask,
} from "@/lib/tasks/actions";
import type { AssigneeOption } from "@/lib/tasks/queries";
import type { TaskActions } from "@/lib/tasks/permissions";
import {
  type OptionalCommentFormValues,
  type ReassignFormValues,
  type RejectExtraHoursFormValues,
  type RequestExtraHoursFormValues,
  type ReturnCommentFormValues,
  optionalCommentFormSchema,
  reassignFormSchema,
  rejectExtraHoursFormSchema,
  requestExtraHoursFormSchema,
  returnCommentFormSchema,
} from "@/lib/tasks/schemas";

type DialogName = "request" | "reject" | "hold" | "cancel" | "reassign" | "done" | "accept" | "return";

type PendingRequest = { id: string; minutes: number; reason: string };

type TaskActionsContextValue = {
  actions: TaskActions;
  status: string;
  pendingRequest: PendingRequest | null;
  busy: boolean;
  open: (name: DialogName) => void;
  beginDone: () => void;
  approve: () => void;
  resume: () => void;
};

const TaskActionsContext = createContext<TaskActionsContextValue | null>(null);

function useTaskActions(): TaskActionsContextValue {
  const value = useContext(TaskActionsContext);
  if (!value) throw new Error("Task actions are only available on the task page.");
  return value;
}

/**
 * Lifecycle actions on a task (PRD §5.1, §5.4, §6.6, §6.7). Buttons that the database
 * would refuse stay hidden; `availableActions` is the list.
 */
export function TaskActions({
  taskId,
  title,
  status,
  timerOnTask,
  pendingRequest,
  members,
  assigneeId,
  actions,
  children,
}: {
  taskId: string;
  title: string;
  status: string;
  timerOnTask: boolean;
  pendingRequest: PendingRequest | null;
  members: AssigneeOption[];
  assigneeId: string | null;
  actions: TaskActions;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { timer, stop } = useTimer();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [busy, setBusy] = useState(false);
  const others = members.filter((member) => member.userId !== assigneeId);

  async function finish(result: ActionResult, success: string) {
    if (!result.ok) {
      if (result.code === "timer_running_on_task") {
        setDialog(null);
        stop({
          nextStep: "Then you can mark the task done.",
          after: () => setDialog("done"),
        });
        return;
      }
      toast.error(result.error);
      return;
    }
    setDialog(null);
    toast.success(success);
    router.refresh();
  }

  async function run(action: () => Promise<ActionResult>, success: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    await finish(result, success);
  }

  function open(name: DialogName) {
    if (!busy) setDialog(name);
  }

  function beginDone() {
    if (timer?.taskId === taskId) {
      stop({
        nextStep: "Then you can mark the task done.",
        after: () => setDialog("done"),
      });
      return;
    }
    setDialog("done");
  }

  const value: TaskActionsContextValue = {
    actions,
    status,
    pendingRequest,
    busy,
    open,
    beginDone,
    approve: () => {
      if (!pendingRequest) return;
      void run(
        () => decideExtraHours({ taskId, requestId: pendingRequest.id, approve: true, reason: "" }),
        `Approved ${formatDuration(pendingRequest.minutes)} of extra hours.`,
      );
    },
    resume: () => void run(() => resumeTask({ taskId }), "Task resumed."),
  };

  return (
    <TaskActionsContext.Provider value={value}>
      {children}
      <Dialog open={dialog != null} onOpenChange={(open) => (open || busy ? null : setDialog(null))}>
        <DialogContent>
          {dialog === "request" ? (
            <RequestForm
              key="request"
              taskId={taskId}
              title={title}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Extra hours requested.")}
            />
          ) : null}
          {dialog === "reject" && pendingRequest ? (
            <RejectForm
              key="reject"
              taskId={taskId}
              request={pendingRequest}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Extra hours rejected.")}
            />
          ) : null}
          {dialog === "hold" ? (
            <ConfirmDialog
              title="Put this task on hold?"
              description={
                timerOnTask
                  ? "No time can be tracked until you resume it. The running timer is stopped and the time is saved."
                  : "No time can be tracked until you resume it."
              }
              action="Put On Hold"
              busy={busy}
              onCancel={() => setDialog(null)}
              onConfirm={() => run(() => holdTask({ taskId }), "Task is on hold.")}
            />
          ) : null}
          {dialog === "cancel" ? (
            <CancelForm
              key="cancel"
              taskId={taskId}
              timerOnTask={timerOnTask}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Task cancelled.")}
            />
          ) : null}
          {dialog === "reassign" ? (
            <ReassignForm
              key="reassign"
              taskId={taskId}
              members={others}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Task reassigned. The new assignee estimates it from scratch.")}
            />
          ) : null}
          {dialog === "done" ? (
            <DoneForm
              key="done"
              taskId={taskId}
              title={title}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Task marked Done.")}
            />
          ) : null}
          {dialog === "accept" ? (
            <ConfirmDialog
              title="Accept this work?"
              description="Accepting is final. No more time can be tracked, and the title and description can't be edited. Comments stay open."
              action="Accept"
              variant="default"
              busy={busy}
              onCancel={() => setDialog(null)}
              onConfirm={() => run(() => acceptTask({ taskId }), "Task accepted.")}
            />
          ) : null}
          {dialog === "return" ? (
            <ReturnForm
              key="return"
              taskId={taskId}
              busy={busy}
              setBusy={setBusy}
              onCancel={() => setDialog(null)}
              onDone={(result) => finish(result, "Task returned to In progress.")}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </TaskActionsContext.Provider>
  );
}

export function TaskHeaderButtons({ slot }: { slot: "lead" | "rest" }) {
  const { actions, busy, open, beginDone, resume } = useTaskActions();

  if (slot === "lead") {
    if (!actions.accept) return null;
    return (
      <Button type="button" disabled={busy} onClick={() => open("accept")}>
        Accept
      </Button>
    );
  }

  const showReassign = actions.reassign && !actions.assign;

  return (
    <>
      {actions.markDone ? (
        <Button type="button" variant="outline" disabled={busy} onClick={beginDone}>
          Mark Done
        </Button>
      ) : null}
      {actions.requestExtraHours ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => open("request")}>
          Request Extra Hours
        </Button>
      ) : null}
      {actions.return ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => open("return")}>
          Return
        </Button>
      ) : null}
      {actions.hold ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => open("hold")}>
          Put On Hold
        </Button>
      ) : null}
      {actions.resume ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={resume}>
          Resume
        </Button>
      ) : null}
      {showReassign ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => open("reassign")}>
          Reassign
        </Button>
      ) : null}
      {actions.cancel ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => open("cancel")}>
          Cancel Task
        </Button>
      ) : null}
    </>
  );
}

export function ExtraHoursCallout() {
  const { actions, status, pendingRequest, busy, open, approve } = useTaskActions();
  if (!pendingRequest) return null;
  const waiting = actions.decideExtraHours
    ? status === "done"
      ? "Decide this before the task can be accepted."
      : "Waiting for your decision."
    : "Waiting for an Admin to decide.";

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-6">
      <h2 className="text-heading-xs">Extra hours requested</h2>
      <p className="text-body-sm">
        <span className="numeric font-medium">+{formatDuration(pendingRequest.minutes)}</span>
        {". "}
        {waiting}
      </p>
      <p className="max-w-2xl whitespace-pre-line text-body-sm">{pendingRequest.reason}</p>
      {actions.decideExtraHours ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="max-sm:w-full" disabled={busy} onClick={approve}>
            Approve Extra Hours
          </Button>
          <Button type="button" variant="outline" className="max-sm:w-full" disabled={busy} onClick={() => open("reject")}>
            Reject
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function RequestForm({
  taskId,
  title,
  busy,
  setBusy,
  onCancel,
  onDone,
}: FormProps & { title: string }) {
  const form = useForm<RequestExtraHoursFormValues>({
    resolver: zodResolver(requestExtraHoursFormSchema),
    defaultValues: { minutes: Number.NaN, reason: "" },
  });

  async function onSubmit(values: RequestExtraHoursFormValues) {
    setBusy(true);
    const result = await requestExtraHours({ taskId, ...values });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Request extra hours</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{title}</span>. These hours are added to the limit once an
          Admin approves them. A task can have one open request.
        </DialogDescription>
      </DialogHeader>
      <Controller
        control={form.control}
        name="minutes"
        render={({ field, fieldState }) => (
          <DurationInput
            id="extra-hours-minutes"
            label="Extra hours"
            step={15}
            onMinutesChange={(minutes) => {
              field.onChange(minutes == null || Number.isNaN(minutes) ? Number.NaN : minutes);
            }}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextareaField control={form.control} name="reason" label="Reason" autoFocus />
      <DialogActions busy={busy || form.formState.isSubmitting} action="Request Extra Hours" onCancel={onCancel} />
    </form>
  );
}

function RejectForm({
  taskId,
  request,
  busy,
  setBusy,
  onCancel,
  onDone,
}: FormProps & { request: PendingRequest }) {
  const form = useForm<RejectExtraHoursFormValues>({
    resolver: zodResolver(rejectExtraHoursFormSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: RejectExtraHoursFormValues) {
    setBusy(true);
    const result = await decideExtraHours({
      taskId,
      requestId: request.id,
      approve: false,
      reason: values.reason,
    });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Reject extra hours</DialogTitle>
        <DialogDescription>
          The request for <span className="numeric font-medium text-foreground">+{formatDuration(request.minutes)}</span>{" "}
          is declined, and over-limit time stays unpaid.
        </DialogDescription>
      </DialogHeader>
      <TextareaField control={form.control} name="reason" label="Reason" autoFocus />
      <DialogActions
        busy={busy || form.formState.isSubmitting}
        action="Reject"
        variant="destructive"
        onCancel={onCancel}
      />
    </form>
  );
}

function CancelForm({
  taskId,
  timerOnTask,
  busy,
  setBusy,
  onCancel,
  onDone,
}: FormProps & { timerOnTask: boolean }) {
  const form = useForm<OptionalCommentFormValues>({
    resolver: zodResolver(optionalCommentFormSchema),
    defaultValues: { comment: "" },
  });

  async function onSubmit(values: OptionalCommentFormValues) {
    setBusy(true);
    const result = await cancelTask({ taskId, comment: values.comment });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Cancel this task?</DialogTitle>
        <DialogDescription>
          Cancelling is final. Time already counted stays payable. An open extra-hours request is cancelled, and an
          estimate still waiting for a decision is withdrawn.
          {timerOnTask ? " The running timer is stopped and the time is saved." : ""}
        </DialogDescription>
      </DialogHeader>
      <TextareaField
        control={form.control}
        name="comment"
        label="Reason"
        description="Optional. It appears in the comments."
        autoFocus
      />
      <DialogActions
        busy={busy || form.formState.isSubmitting}
        action="Cancel Task"
        variant="destructive"
        onCancel={onCancel}
      />
    </form>
  );
}

function ReassignForm({
  taskId,
  members,
  busy,
  setBusy,
  onCancel,
  onDone,
}: FormProps & { members: AssigneeOption[] }) {
  const form = useForm<ReassignFormValues>({
    resolver: zodResolver(reassignFormSchema),
    defaultValues: { assigneeId: "" },
  });

  async function onSubmit(values: ReassignFormValues) {
    setBusy(true);
    const result = await reassignTask({ taskId, assigneeId: values.assigneeId });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Reassign this task?</DialogTitle>
        <DialogDescription>
          It goes back to Draft. The approved estimate stops applying, and the new person estimates it from scratch.
          The previous assignee loses access.
        </DialogDescription>
      </DialogHeader>
      {members.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          There is nobody else to assign it to. Add a member to the project first.
        </p>
      ) : (
        <Controller
          control={form.control}
          name="assigneeId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reassign-assignee">New assignee</FieldLabel>
              <Select
                items={Object.fromEntries(members.map((member) => [member.userId, member.fullName]))}
                value={field.value || null}
                onValueChange={(value) => {
                  if (typeof value === "string") field.onChange(value);
                }}
              >
                <SelectTrigger id="reassign-assignee" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
                  <SelectValue placeholder="Choose a person" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      )}
      <DialogActions
        busy={busy || form.formState.isSubmitting}
        action="Reassign"
        disabled={members.length === 0}
        onCancel={onCancel}
      />
    </form>
  );
}

function DoneForm({ taskId, title, busy, setBusy, onCancel, onDone }: FormProps & { title: string }) {
  const form = useForm<OptionalCommentFormValues>({
    resolver: zodResolver(optionalCommentFormSchema),
    defaultValues: { comment: "" },
  });

  async function onSubmit(values: OptionalCommentFormValues) {
    setBusy(true);
    const result = await markTaskDone({ taskId, comment: values.comment });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Mark this task done?</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{title}</span> waits for an Admin to accept it. No more time
          can be tracked unless it is returned.
        </DialogDescription>
      </DialogHeader>
      <TextareaField
        control={form.control}
        name="comment"
        label="Comment"
        description="Optional. It appears in the comments."
        autoFocus
      />
      <DialogActions busy={busy || form.formState.isSubmitting} action="Mark Done" onCancel={onCancel} />
    </form>
  );
}

function ReturnForm({ taskId, busy, setBusy, onCancel, onDone }: FormProps) {
  const form = useForm<ReturnCommentFormValues>({
    resolver: zodResolver(returnCommentFormSchema),
    defaultValues: { comment: "" },
  });

  async function onSubmit(values: ReturnCommentFormValues) {
    setBusy(true);
    const result = await returnTask({ taskId, comment: values.comment });
    setBusy(false);
    if (!result.ok) applyFieldErrors(form.setError, result.fieldErrors);
    onDone(result);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Return this task</DialogTitle>
        <DialogDescription>
          It goes back to In progress so the assignee can keep working. Your comment appears in the task&apos;s
          comment thread.
        </DialogDescription>
      </DialogHeader>
      <TextareaField control={form.control} name="comment" label="What should change" autoFocus />
      <DialogActions busy={busy || form.formState.isSubmitting} action="Return" onCancel={onCancel} />
    </form>
  );
}

type FormProps = {
  taskId: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onCancel: () => void;
  onDone: (result: ActionResult) => void;
};

function ConfirmDialog({
  title,
  description,
  action,
  variant = "secondary",
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  action: string;
  variant?: "default" | "secondary";
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant={variant} disabled={busy} onClick={onConfirm}>
          {action}
        </Button>
      </DialogFooter>
    </>
  );
}

function DialogActions({
  busy,
  action,
  variant = "default",
  disabled,
  onCancel,
}: {
  busy: boolean;
  action: string;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <SubmitButton variant={variant} pending={busy} disabled={busy || disabled}>
        {action}
      </SubmitButton>
    </DialogFooter>
  );
}
