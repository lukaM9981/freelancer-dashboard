"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DurationInput } from "@/components/duration-input";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { TextareaField } from "@/components/textarea-field";
import { buttonVariants } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { formatDuration } from "@/lib/duration";
import { applyFieldErrors } from "@/lib/forms";
import { createTask, updateTask } from "@/lib/tasks/actions";
import type { AssigneeOption } from "@/lib/tasks/queries";
import { type TaskFormValues, UNASSIGNED, taskFormSchema } from "@/lib/tasks/schemas";
import { cn } from "@/lib/utils";

type TaskFormProps = {
  cancelHref: string;
  defaults: TaskFormValues;
  /** Admins pick the assignee: when creating, and on a draft that was never submitted. */
  assignees: AssigneeOption[] | null;
  /** Only the assignee estimates (PRD §6.4). */
  showEstimate: boolean;
} & ({ mode: "create"; projectId: string } | { mode: "edit"; taskId: string; canUnassign: boolean });

export function TaskForm(props: TaskFormProps) {
  const router = useRouter();
  const { assignees, showEstimate, defaults } = props;
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaults,
  });

  const assigneeOptions = assignees
    ? [
        ...(props.mode === "create" || props.canUnassign ? [{ value: UNASSIGNED, label: "Unassigned" }] : []),
        ...assignees.map((person) => ({ value: person.userId, label: person.fullName })),
      ]
    : null;

  async function onSubmit(values: TaskFormValues) {
    const assigneeId = values.assignee === UNASSIGNED ? null : values.assignee;
    const estimate = showEstimate
      ? { estimateMin: values.estimateMin, estimateMax: values.estimateMax, estimateNote: values.estimateNote }
      : { estimateMin: null, estimateMax: null, estimateNote: "" };

    const result =
      props.mode === "create"
        ? await createTask({
            projectId: props.projectId,
            title: values.title,
            description: values.description,
            assigneeId,
            ...estimate,
          })
        : await updateTask({
            taskId: props.taskId,
            title: values.title,
            description: values.description,
            ...(assignees ? { assigneeId } : {}),
            ...estimate,
          });
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    if (props.mode === "edit") {
      toast.success("Task saved.");
      router.push(`/tasks/${props.taskId}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-xl flex-col gap-8">
      <FieldGroup>
        <TextField control={form.control} name="title" label="Title" autoComplete="off" autoFocus />
        <TextareaField
          control={form.control}
          name="description"
          label="Description"
          description="Optional. What needs to be done, in plain text."
        />
        {assigneeOptions ? (
          <SelectField
            control={form.control}
            name="assignee"
            label="Assignee"
            options={assigneeOptions}
            description={
              props.mode === "create"
                ? "A member of the project. They are asked to estimate the task. Unassigned tasks are visible to Admins only."
                : "Changing the assignee clears the estimate, so the new person estimates from scratch."
            }
          />
        ) : null}
      </FieldGroup>

      {showEstimate ? (
        <FieldSet>
          <FieldLegend>Estimate</FieldLegend>
          <p className="text-caption text-muted-foreground">
            A range of hours. Optional until you submit the task for approval.
          </p>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <Controller
                control={form.control}
                name="estimateMin"
                render={({ field, fieldState }) => (
                  <DurationInput
                    id="field-estimateMin"
                    label="Minimum"
                    step={15}
                    defaultValue={minutesText(defaults.estimateMin)}
                    onMinutesChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <span aria-hidden="true" className="hidden pt-9 text-body-sm text-muted-foreground sm:block">
                {"\u2013"}
              </span>
              <Controller
                control={form.control}
                name="estimateMax"
                render={({ field, fieldState }) => (
                  <DurationInput
                    id="field-estimateMax"
                    label="Maximum"
                    step={15}
                    defaultValue={minutesText(defaults.estimateMax)}
                    onMinutesChange={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </div>
            <TextareaField
              control={form.control}
              name="estimateNote"
              label="Note"
              description="Optional. The assumptions behind the estimate."
            />
          </FieldGroup>
        </FieldSet>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={props.cancelHref} className={cn(buttonVariants({ variant: "outline" }))}>
          Cancel
        </Link>
        <SubmitButton pending={form.formState.isSubmitting}>
          {props.mode === "create" ? "Create Task" : "Save Task"}
        </SubmitButton>
      </div>
    </form>
  );
}

function minutesText(minutes: number | null): string {
  return minutes == null ? "" : formatDuration(minutes);
}
