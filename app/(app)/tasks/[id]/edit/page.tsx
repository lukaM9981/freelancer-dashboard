import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { TaskForm } from "@/components/tasks/task-form";
import { buttonVariants } from "@/components/ui/button";
import { getViewer, requireViewer } from "@/lib/auth/queries";
import { getTask, listAssigneeOptions } from "@/lib/tasks/queries";
import { UNASSIGNED } from "@/lib/tasks/schemas";
import { cn } from "@/lib/utils";

type EditTaskPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
};

export async function generateMetadata({ params }: EditTaskPageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const task = viewer ? await getTask(id, viewer) : null;
  return { title: `Edit ${task?.title ?? "task"} · Olifant Workboard` };
}

export default async function EditTaskPage({ params, searchParams }: EditTaskPageProps) {
  const viewer = await requireViewer();
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const task = await getTask(id, viewer);
  if (!task) notFound();
  const taskHref = `/tasks/${task.id}`;
  if (!task.actions.editDetails) redirect(taskHref);

  const assignees = task.actions.assign ? await listAssigneeOptions(task.project.id) : null;
  const estimateNotSaved = notice === "estimate-not-saved";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href={taskHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader
          eyebrow={task.project.name}
          title="Edit task"
          action={task.actions.delete ? <DeleteTaskButton taskId={task.id} title={task.title} /> : undefined}
        />
      </div>
      {estimateNotSaved ? (
        <p role="status" className="max-w-xl text-body-sm">
          The task was created, but its estimate wasn&apos;t saved. Enter it again below.
        </p>
      ) : null}
      {task.everSubmitted ? (
        <p className="max-w-xl text-body-sm text-muted-foreground">
          This task has been submitted before, so every change is recorded in its history.
        </p>
      ) : null}
      <TaskForm
        mode="edit"
        taskId={task.id}
        cancelHref={taskHref}
        assignees={assignees}
        canUnassign={task.assigneeId == null}
        showEstimate={task.actions.estimate}
        defaults={{
          title: task.title,
          description: task.description,
          assignee: task.assigneeId ?? UNASSIGNED,
          estimateMin: task.estimate?.minMinutes ?? null,
          estimateMax: task.estimate?.maxMinutes ?? null,
          estimateNote: task.estimate?.note ?? "",
        }}
      />
    </div>
  );
}
