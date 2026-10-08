"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { DurationField } from "@/components/time/duration-field";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCalendarDate } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { addTimeEntry } from "@/lib/time/actions";
import { type AddTimeEntryInput, addTimeEntrySchema } from "@/lib/time/schemas";

export type TimeTaskOption = {
  id: string;
  title: string;
  projectName: string;
  dateMin: string;
};

type AddTimeDialogProps = {
  tasks: TimeTaskOption[];
  today: string;
  trigger: "primary" | "outline";
  /** `yyyy-MM` of the month on screen. Set on My time so an entry in another month opens there. */
  viewedMonth?: string;
  /** `yyyy-MM` of the organization's current month. The current month has no query string. */
  currentMonth?: string;
};

export function AddTimeDialog({ tasks, today, trigger, viewedMonth, currentMonth }: AddTimeDialogProps) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <>
      <Button type="button" variant={trigger === "outline" ? "outline" : "default"} onClick={() => setOpen(true)}>
        <PlusIcon />
        Add Time
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open ? (
            <AddTimeForm
              tasks={tasks}
              today={today}
              viewedMonth={viewedMonth}
              currentMonth={currentMonth}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddTimeForm({
  tasks,
  today,
  viewedMonth,
  currentMonth,
  onDone,
}: {
  tasks: TimeTaskOption[];
  today: string;
  viewedMonth?: string;
  currentMonth?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const only = tasks.length === 1 ? tasks[0] : null;
  const form = useForm<AddTimeEntryInput>({
    resolver: zodResolver(addTimeEntrySchema),
    defaultValues: {
      taskId: (only ?? tasks[0]).id,
      workDate: today,
      minutes: Number.NaN,
      description: "",
    },
  });
  const taskId = useWatch({ control: form.control, name: "taskId" });
  const task = tasks.find((item) => item.id === taskId) ?? tasks[0];

  useEffect(() => {
    const date = form.getValues("workDate");
    if (date < task.dateMin) form.setValue("workDate", task.dateMin);
  }, [task.dateMin, form]);

  async function onSubmit(values: AddTimeEntryInput) {
    const result = await addTimeEntry(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Time added.");
    onDone();
    const savedMonth = values.workDate.slice(0, 7);
    if (viewedMonth && currentMonth && savedMonth !== viewedMonth) {
      router.push(savedMonth === currentMonth ? "/time" : `/time?month=${savedMonth}`);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Add time</DialogTitle>
        <DialogDescription>
          {only
            ? `${only.projectName} · ${only.title}. Record work that wasn't timed.`
            : "Record work that wasn't timed."}
        </DialogDescription>
      </DialogHeader>
      {only ? null : (
        <SelectField
          control={form.control}
          name="taskId"
          label="Task"
          options={tasks.map((item) => ({ value: item.id, label: `${item.projectName} · ${item.title}` }))}
        />
      )}
      <TextField
        control={form.control}
        name="workDate"
        id="add-time-date"
        label="Date"
        type="date"
        min={task.dateMin}
        max={today}
        description={`From ${formatCalendarDate(task.dateMin)} to today.`}
        autoFocus={only != null}
      />
      <DurationField control={form.control} name="minutes" id="add-time-duration" />
      <TextareaField
        control={form.control}
        name="description"
        id="add-time-description"
        label="What did you work on?"
        autoFocus={only == null}
      />
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton pending={form.formState.isSubmitting}>Add Time</SubmitButton>
      </DialogFooter>
    </form>
  );
}
