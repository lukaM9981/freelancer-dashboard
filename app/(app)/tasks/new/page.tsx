import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { TaskForm } from "@/components/tasks/task-form";
import { buttonVariants } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/queries";
import { getNewTaskContext } from "@/lib/tasks/queries";
import { UNASSIGNED } from "@/lib/tasks/schemas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "New task · Olifant Workboard" };

type NewTaskPageProps = { searchParams: Promise<{ project?: string | string[] }> };

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const viewer = await requireViewer();
  const { project: projectParam } = await searchParams;
  const projectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;
  if (!projectId) notFound();

  const context = await getNewTaskContext(projectId, viewer);
  if (!context) notFound();
  const isAdmin = viewer.role === "admin";
  const projectHref = `/projects/${context.project.id}`;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href={projectHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader eyebrow={context.project.name} title="New task" />
      </div>
      <p className="max-w-xl text-body-sm text-muted-foreground">
        {isAdmin
          ? "The task starts as a Draft. The assignee estimates it and submits it for approval."
          : "The task is assigned to you and starts as a Draft. Submit it for approval once it has an estimate."}
      </p>
      <TaskForm
        mode="create"
        projectId={context.project.id}
        cancelHref={projectHref}
        assignees={context.assignees}
        showEstimate={!isAdmin}
        defaults={{
          title: "",
          description: "",
          assignee: UNASSIGNED,
          estimateMin: null,
          estimateMax: null,
          estimateNote: "",
        }}
      />
    </div>
  );
}
