import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectStatusBadge } from "@/components/projects/labels";
import { MembersSection } from "@/components/projects/members-section";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ProjectStatusActions } from "@/components/projects/project-status-actions";
import { TaskFilters } from "@/components/projects/task-filters";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, TASK_STATUSES, type TaskStatus } from "@/components/status-badge";
import { StartTimerButton } from "@/components/timer/start-timer-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getViewer, requireViewer } from "@/lib/auth/queries";
import { formatDuration } from "@/lib/format";
import { isTaskStatus } from "@/lib/projects/figures";
import { getProject, type ProjectTask } from "@/lib/projects/queries";
import { canCreateTaskIn } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const UNASSIGNED = "unassigned";
const TRACKABLE: ReadonlySet<TaskStatus> = new Set(["approved", "in_progress"]);

const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  changes_requested: "Changes requested",
  approved: "Approved",
  in_progress: "In progress",
  on_hold: "On hold",
  done: "Done",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

type ProjectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string | string[]; assignee?: string | string[] }>;
};

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const project = viewer ? await getProject(id, viewer) : null;
  return { title: `${project?.name ?? "Project"} · Projects · Olifant Workboard` };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const viewer = await requireViewer();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await getProject(id, viewer);
  if (!project) notFound();

  const isAdmin = viewer.role === "admin";
  const archived = project.status === "archived";
  const canCreateTask = !archived && (await canCreateTaskIn(project.id, viewer));
  const newTaskButton = canCreateTask ? (
    <Link href={`/tasks/new?project=${project.id}`} className={buttonVariants()}>
      New Task
    </Link>
  ) : null;
  const canPropose =
    !isAdmin && !archived && project.tasks.some((task) => task.status === "draft" || task.status === "changes_requested");
  const freelancerActions =
    newTaskButton || canPropose ? (
      <div className="contents">
        {canPropose ? (
          <Link href={`/proposals/new?project=${project.id}`} className={buttonVariants({ variant: "secondary" })}>
            Submit Proposal
          </Link>
        ) : null}
        {newTaskButton}
      </div>
    ) : undefined;

  const assigneeOptions = isAdmin ? assigneeOptionsFor(project.tasks) : null;
  const statusFilter = single(query.status);
  const assigneeFilter = single(query.assignee);
  const status = statusFilter && isTaskStatus(statusFilter) ? statusFilter : null;
  const assignee =
    assigneeOptions && assigneeFilter && assigneeOptions.some((option) => option.value === assigneeFilter)
      ? assigneeFilter
      : null;
  const tasks = project.tasks.filter(
    (task) =>
      (!status || task.status === status) &&
      (!assignee || (assignee === UNASSIGNED ? task.assigneeId == null : task.assigneeId === assignee)),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/projects" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader
          eyebrow="Projects"
          title={project.name}
          action={
            isAdmin ? (
              <div className="contents">
                {newTaskButton}
                {archived ? null : (
                  <ProjectDialog
                    mode="edit"
                    projectId={project.id}
                    name={project.name}
                    description={project.description}
                  />
                )}
                <ProjectStatusActions projectId={project.id} status={project.status} />
              </div>
            ) : (
              freelancerActions
            )
          }
        />
      </div>

      <div className="space-y-3">
        <ProjectStatusBadge status={project.status} />
        {project.description ? (
          <p className="max-w-2xl whitespace-pre-line text-body-sm text-muted-foreground">{project.description}</p>
        ) : null}
        {project.status === "on_hold" ? (
          <p className="text-body-sm">On hold: planning continues, but no time can be tracked on its tasks.</p>
        ) : null}
        {archived ? <p className="text-body-sm">Archived: this project is read-only.</p> : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-heading-xs">{isAdmin ? "Summary" : "Your summary"}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Approved time" value={formatDuration(project.summary.approvedMinutes)} />
          <StatCard label="Counted time" value={formatDuration(project.summary.countedMinutes)} />
          <StatCard label="Remaining time" value={formatDuration(project.summary.remainingMinutes)} />
          <StatCard label="Over limit, unpaid" value={formatDuration(project.summary.overLimitMinutes)} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">{isAdmin ? "Tasks" : "Your tasks"}</h2>
        {project.tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description={
              isAdmin
                ? "Tasks created in this project will show up here."
                : "Tasks assigned to you in this project will show up here."
            }
          />
        ) : (
          <>
            <TaskFilters
              status={status}
              assignee={assignee}
              statusOptions={TASK_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
              assigneeOptions={assigneeOptions}
            />
            {tasks.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No tasks match these filters.</p>
            ) : (
              <TaskTable
                tasks={tasks}
                showAssignee={isAdmin}
                timerProjectName={!isAdmin && project.status === "active" ? project.name : null}
              />
            )}
          </>
        )}
      </section>

      {isAdmin && project.members && project.candidates ? (
        <section className="space-y-4">
          <h2 className="text-heading-xs">Members</h2>
          <MembersSection
            projectId={project.id}
            members={project.members}
            candidates={project.candidates}
            readOnly={archived}
          />
        </section>
      ) : null}
    </div>
  );
}

function TaskTable({
  tasks,
  showAssignee,
  timerProjectName,
}: {
  tasks: ProjectTask[];
  showAssignee: boolean;
  /** Set when the viewer can track time here: the freelancer's own tasks in an Active project. */
  timerProjectName: string | null;
}) {
  const showTimer = timerProjectName != null && tasks.some((task) => TRACKABLE.has(task.status));
  return (
    <Table>
      <caption className="sr-only">Tasks in this project</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          {showAssignee ? <TableHead>Assignee</TableHead> : null}
          <TableHead className="text-right">Counted</TableHead>
          <TableHead className="text-right">Over limit</TableHead>
          {showTimer ? (
            <TableHead>
              <span className="sr-only">Timer</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell data-label="Task" className="font-medium md:max-w-96 md:whitespace-normal">
              <Link
                href={`/tasks/${task.id}`}
                className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
              >
                {task.title}
              </Link>
            </TableCell>
            <TableCell data-label="Status">
              <StatusBadge status={task.status} />
            </TableCell>
            {showAssignee ? (
              <TableCell data-label="Assignee">{task.assigneeName ?? "Unassigned"}</TableCell>
            ) : null}
            <TableCell data-label="Counted" className="numeric md:text-right">
              {formatDuration(task.countedMinutes)}
              {task.limitMinutes != null ? (
                <span className="text-muted-foreground"> of {formatDuration(task.limitMinutes)}</span>
              ) : null}
            </TableCell>
            <TableCell data-label="Over limit" className="numeric md:text-right">
              {task.overLimitMinutes > 0 ? formatDuration(task.overLimitMinutes) : "—"}
            </TableCell>
            {showTimer ? (
              <TableCell className="md:text-right">
                {TRACKABLE.has(task.status) ? (
                  <StartTimerButton
                    variant="icon"
                    task={{ id: task.id, title: task.title, projectName: timerProjectName }}
                  />
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function assigneeOptionsFor(tasks: ProjectTask[]) {
  const names = new Map<string, string>();
  let hasUnassigned = false;
  for (const task of tasks) {
    if (task.assigneeId) names.set(task.assigneeId, task.assigneeName ?? "Unknown person");
    else hasUnassigned = true;
  }
  const options = [...names]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
  return hasUnassigned ? [...options, { value: UNASSIGNED, label: "Unassigned" }] : options;
}

function single(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
