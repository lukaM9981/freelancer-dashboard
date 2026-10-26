import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { type CommentView, CommentsSection } from "@/components/tasks/comments-section";
import { TaskHistory } from "@/components/tasks/task-history";
import { SubmitTaskButton, WithdrawButton } from "@/components/proposals/proposal-actions";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { ExtraHoursCallout, TaskActions, TaskHeaderButtons } from "@/components/tasks/task-actions";
import { AddTimeDialog } from "@/components/time/add-time-dialog";
import { EntrySource, OverLimit } from "@/components/time/entry-source";
import { TimeEntryActions } from "@/components/time/time-entry-actions";
import { RunningTimerBadge } from "@/components/timer/running-timer-badge";
import { TaskScreenshots } from "@/components/timer/task-screenshots";
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
import { type Viewer, getViewer, requireViewer } from "@/lib/auth/queries";
import { formatCalendarDate, formatDateTime, formatDuration, formatEstimateRange } from "@/lib/format";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { listTaskScreenshots } from "@/lib/time/screenshots";
import { canChangeComment } from "@/lib/tasks/permissions";
import { type TaskDetail, getTask, listAssigneeOptions } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

type TaskPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: TaskPageProps): Promise<Metadata> {
  const { id } = await params;
  const viewer = await getViewer();
  const task = viewer ? await getTask(id, viewer) : null;
  return { title: `${task?.title ?? "Task"} · Olifant Workboard` };
}

export default async function TaskPage({ params }: TaskPageProps) {
  const viewer = await requireViewer();
  const { id } = await params;
  const task = await getTask(id, viewer);
  if (!task) notFound();
  const [screenshots, settings] = await Promise.all([
    listTaskScreenshots(task.id, viewer),
    getOrganizationSettings(),
  ]);

  const isAdmin = viewer.role === "admin";
  const { actions } = task;
  const members = actions.reassign && !actions.assign ? await listAssigneeOptions(task.project.id) : [];
  const pendingRequest = task.extraHours.find((request) => request.status === "pending") ?? null;
  const hasLifecycle =
    actions.accept ||
    actions.markDone ||
    actions.requestExtraHours ||
    actions.return ||
    actions.hold ||
    actions.resume ||
    (actions.reassign && !actions.assign) ||
    actions.cancel;
  const shownEstimate = task.approvedEstimate ?? task.estimate;
  const pendingRevision = task.revisions.find((revision) => revision.decision === "pending");
  const headerActions = [
    actions.trackTime ? (
      <StartTimerButton
        key="timer"
        variant="primary"
        task={{ id: task.id, title: task.title, projectName: task.project.name }}
      />
    ) : null,
    actions.trackTime && task.workDateMin && task.workDateMin <= task.today ? (
      <AddTimeDialog
        key="add-time"
        trigger="outline"
        today={task.today}
        tasks={[
          {
            id: task.id,
            title: task.title,
            projectName: task.project.name,
            dateMin: task.workDateMin,
          },
        ]}
      />
    ) : null,
    actions.submit ? <SubmitTaskButton key="submit" projectId={task.project.id} taskId={task.id} /> : null,
    actions.decideEstimate && pendingRevision ? (
      <Link key="review" href={`/approvals/${pendingRevision.proposalId}`} className={buttonVariants()}>
        Review Proposal
      </Link>
    ) : null,
    actions.withdraw && pendingRevision ? (
      <WithdrawButton
        key="withdraw"
        proposalId={pendingRevision.proposalId}
        revisionIds={[pendingRevision.id]}
        label="Withdraw"
      />
    ) : null,
    actions.editDetails ? (
      <Link key="edit" href={`/tasks/${task.id}/edit`} className={buttonVariants({ variant: "outline" })}>
        Edit
      </Link>
    ) : null,
    actions.delete ? <DeleteTaskButton key="delete" taskId={task.id} title={task.title} /> : null,
  ].filter(Boolean);
  const comments: CommentView[] = task.comments.map((comment) => ({
    id: comment.id,
    authorName: comment.authorId === viewer.id ? "You" : comment.authorName,
    kind: comment.kind,
    body: comment.body,
    createdLabel: formatDateTime(comment.createdAt, task.timeZone),
    edited: comment.editedAt != null,
    canChange: canChangeComment(comment, { projectStatus: task.project.status }, viewer),
  }));

  return (
    <TaskActions
      taskId={task.id}
      title={task.title}
      status={task.status}
      timerOnTask={task.timerRunning}
      pendingRequest={pendingRequest}
      members={members}
      assigneeId={task.assigneeId}
      actions={actions}
    >
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href={`/projects/${task.project.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader
          eyebrow={task.project.name}
          title={task.title}
          action={
            headerActions.length > 0 || hasLifecycle ? (
              <div className="contents">
                <TaskHeaderButtons slot="lead" />
                {headerActions}
                <TaskHeaderButtons slot="rest" />
              </div>
            ) : undefined
          }
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-body-sm">
          <StatusBadge status={task.status} />
          {isAdmin ? (
            <span className="text-muted-foreground">
              {task.assigneeId ? `Assigned to ${task.assigneeName ?? "Unknown person"}` : "Unassigned"}
            </span>
          ) : null}
          {isAdmin && task.timerStartedAt ? (
            task.timerPausedAt ? (
              <span className="inline-flex h-7 items-center gap-2 rounded-full bg-secondary px-3 text-body-xs text-secondary-foreground">
                <span className="size-2 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
                Timer paused{task.assigneeName ? ` · ${task.assigneeName}` : ""}
              </span>
            ) : (
              <RunningTimerBadge
                startedAt={task.timerStartedAt}
                serverNow={new Date().toISOString()}
                personName={task.assigneeName}
              />
            )
          ) : null}
        </div>
        <StatusHint task={task} viewer={viewer} />
      </div>

      <ExtraHoursCallout />

      <section className="space-y-4">
        <h2 className="sr-only">Estimate and time</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label={task.approvedEstimate ? "Approved estimate" : "Estimate"}
            value={shownEstimate ? formatEstimateRange(shownEstimate.minMinutes, shownEstimate.maxMinutes) : "\u2014"}
          />
          <StatCard label="Counted time" value={formatDuration(task.countedMinutes)} />
        </div>
        {shownEstimate?.note ? (
          <p className="max-w-2xl whitespace-pre-line text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground">Estimate note: </span>
            {shownEstimate.note}
          </p>
        ) : null}
        {task.approvedEstimate && task.estimate && !sameEstimate(task.approvedEstimate, task.estimate) ? (
          <p className="text-body-sm text-muted-foreground">
            Working estimate:{" "}
            <span className="numeric">
              {formatEstimateRange(task.estimate.minMinutes, task.estimate.maxMinutes)}
            </span>
          </p>
        ) : null}
      </section>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-heading-xs">Description</h2>
          {task.description ? (
            <p className="max-w-2xl whitespace-pre-line break-words text-body-sm">{task.description}</p>
          ) : (
            <p className="text-body-sm text-muted-foreground">No description.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-heading-xs">Time entries</h2>
          <TimeEntries task={task} />
        </section>

        <TaskScreenshots
          shots={screenshots}
          timeZone={settings.timeZone}
          today={task.today}
          canDelete={!isAdmin && task.assigneeId === viewer.id}
        />

        <section className="space-y-4">
          <h2 className="text-heading-xs">Comments</h2>
          <CommentsSection taskId={task.id} comments={comments} canComment={actions.comment} />
        </section>

        <section className="space-y-4">
          <h2 className="text-heading-xs">History</h2>
          <TaskHistory entries={task.history} timeZone={task.timeZone} />
        </section>
      </div>
    </div>
    </TaskActions>
  );
}

function StatusHint({ task, viewer }: { task: TaskDetail; viewer: Viewer }) {
  const isAssignee = task.assigneeId === viewer.id;
  let hint: string | null = null;

  if (task.project.status === "archived") {
    hint = "The project is archived, so this task is read-only.";
  } else if (task.status === "draft" && task.assigneeId == null) {
    hint = "Nobody is assigned yet. Assign a member so they can estimate it.";
  } else if ((task.status === "draft" || task.status === "changes_requested") && isAssignee) {
    hint = task.estimate
      ? "Your estimate is saved. Submit it for approval in a proposal."
      : "Waiting for your estimate. Edit the task to add one.";
  } else if (task.status === "draft" || task.status === "changes_requested") {
    hint = "Waiting for the assignee's estimate.";
  } else if (task.status === "pending_approval") {
    hint = "The estimate is waiting for an Admin's decision.";
  } else if (task.status === "on_hold") {
    hint = "On hold: no time can be tracked until an Admin resumes it.";
  } else if (task.project.status === "on_hold" && (task.status === "approved" || task.status === "in_progress")) {
    hint = "The project is on hold, so no time can be tracked on this task.";
  } else if (task.status === "done" && isAssignee && !task.extraHoursPending) {
    hint = "Waiting for an Admin to accept this work.";
  } else if (task.status === "done" && !task.extraHoursPending) {
    hint = "Accept the work, or return it with a comment.";
  } else if (task.status === "accepted") {
    hint = "Accepted. No more time can be tracked, and the title and description stay as they are.";
  } else if (task.status === "cancelled") {
    hint = "Cancelled. Time already counted stays payable.";
  }

  return hint ? <p className="max-w-2xl text-body-sm">{hint}</p> : null;
}

function TimeEntries({ task }: { task: TaskDetail }) {
  if (task.entries.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No time tracked yet.</p>;
  }
  const actionable = task.entries.some((entry) => entry.canEdit || entry.canCorrectDescription);
  return (
    <Table>
      <caption className="sr-only">Time entries on this task</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead className="text-right">Over limit</TableHead>
          {actionable ? (
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {task.entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell data-label="Date" className="font-medium whitespace-nowrap">
              {formatCalendarDate(entry.workDate)}
            </TableCell>
            <TableCell data-label="Description" className="md:max-w-80 md:whitespace-normal">
              <span className="whitespace-pre-line break-words">{entry.description}</span>
            </TableCell>
            <TableCell data-label="Source">
              <EntrySource
                source={entry.source}
                startedAt={entry.startedAt}
                endedAt={entry.endedAt}
                timeZone={task.timeZone}
                autoStoppedReason={entry.autoStoppedReason}
              />
            </TableCell>
            <TableCell data-label="Duration" className="numeric md:text-right">
              {formatDuration(entry.durationMinutes)}
            </TableCell>
            <TableCell data-label="Over limit" className="md:text-right">
              <OverLimit minutes={entry.overLimitMinutes} />
            </TableCell>
            {actionable ? (
              <TableCell data-label="Actions" className="md:text-right">
                <TimeEntryActions
                  entry={{ ...entry, dateMin: task.workDateMin ?? entry.workDate }}
                  dateMax={task.today}
                  timeZone={task.timeZone}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function sameEstimate(a: { minMinutes: number; maxMinutes: number }, b: { minMinutes: number; maxMinutes: number }) {
  return a.minMinutes === b.minMinutes && a.maxMinutes === b.maxMinutes;
}
