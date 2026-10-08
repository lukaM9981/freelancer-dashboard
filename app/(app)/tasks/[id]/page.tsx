import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { HoursMeter } from "@/components/hours-meter";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { type CommentView, CommentsSection } from "@/components/tasks/comments-section";
import { SubmitTaskButton, WithdrawButton } from "@/components/proposals/proposal-actions";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { LinksSection } from "@/components/tasks/links-section";
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
import { canChangeComment } from "@/lib/tasks/permissions";
import { type TaskDetail, getTask } from "@/lib/tasks/queries";
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

  const isAdmin = viewer.role === "admin";
  const { actions } = task;
  const shownEstimate = task.approvedEstimate ?? task.estimate;
  const pendingRevision = task.revisions.find((revision) => revision.decision === "pending");
  const headerActions = [
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
            headerActions.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">{headerActions}</div>
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
        </div>
        <StatusHint task={task} viewer={viewer} />
      </div>

      <section className="space-y-4">
        <h2 className="sr-only">Estimate and time</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={task.approvedEstimate ? "Approved estimate" : "Estimate"}
            value={shownEstimate ? formatEstimateRange(shownEstimate.minMinutes, shownEstimate.maxMinutes) : "\u2014"}
          />
          <StatCard label="Limit" value={task.limitMinutes != null ? formatDuration(task.limitMinutes) : "\u2014"} />
          <StatCard
            label="Ceiling, with tolerance"
            value={task.ceilingMinutes != null ? formatDuration(task.ceilingMinutes) : "\u2014"}
          />
          <StatCard label="Counted time" value={formatDuration(task.countedMinutes)} />
        </div>
        {task.limitMinutes != null && task.ceilingMinutes != null ? (
          <HoursMeter
            countedMinutes={task.countedMinutes + task.overLimitMinutes}
            limitMinutes={task.limitMinutes}
            ceilingMinutes={task.ceilingMinutes}
          />
        ) : null}
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
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

          <section className="space-y-4">
            <h2 className="text-heading-xs">Comments</h2>
            <CommentsSection taskId={task.id} comments={comments} canComment={actions.comment} />
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-heading-xs">Links</h2>
            <LinksSection taskId={task.id} links={task.links} canManage={actions.manageLinks} />
          </section>

          <section className="space-y-4">
            <h2 className="text-heading-xs">Estimate history</h2>
            <EstimateHistory task={task} />
          </section>

          <section className="space-y-4">
            <h2 className="text-heading-xs">Extra-hours requests</h2>
            <ExtraHoursHistory task={task} />
          </section>

          <section className="space-y-4">
            <h2 className="text-heading-xs">History</h2>
            <ActivityHistory task={task} />
          </section>
        </div>
      </div>
    </div>
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
  }

  return hint ? <p className="max-w-2xl text-body-sm">{hint}</p> : null;
}

function TimeEntries({ task }: { task: TaskDetail }) {
  if (task.entries.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No time tracked yet.</p>;
  }
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {task.entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell data-label="Date" className="font-medium whitespace-nowrap">
              {formatCalendarDate(entry.workDate)}
            </TableCell>
            <TableCell data-label="Description" className="md:max-w-80 md:whitespace-normal">
              {entry.description}
            </TableCell>
            <TableCell data-label="Source">
              {entry.source === "timer" ? "Timed" : "Manual"}
              {entry.autoStoppedReason ? (
                <span className="block text-caption text-muted-foreground">Stopped automatically</span>
              ) : null}
            </TableCell>
            <TableCell data-label="Duration" className="numeric md:text-right">
              {formatDuration(entry.durationMinutes)}
            </TableCell>
            <TableCell data-label="Over limit" className="numeric md:text-right">
              {entry.overLimitMinutes > 0 ? formatDuration(entry.overLimitMinutes) : "\u2014"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EstimateHistory({ task }: { task: TaskDetail }) {
  if (task.revisions.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No estimate submitted yet.</p>;
  }
  return (
    <ol className="divide-y divide-border rounded-lg border border-border">
      {task.revisions.map((revision) => (
        <li key={revision.id} className="space-y-1.5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm font-medium">
              Revision <span className="numeric">{revision.number}</span>
              {" \u00b7 "}
              <span className="numeric">{formatEstimateRange(revision.minMinutes, revision.maxMinutes)}</span>
            </span>
            <StatusBadge kind="revision" status={revision.decision} />
          </div>
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-caption text-muted-foreground">
              Submitted {formatDateTime(revision.submittedAt, task.timeZone)}
            </span>
            <Link
              href={`/approvals/${revision.proposalId}`}
              className="rounded-sm text-caption text-link underline-offset-4 hover:underline focus-ring"
            >
              View proposal
            </Link>
          </p>
          {revision.note ? <p className="whitespace-pre-line text-body-xs">{revision.note}</p> : null}
          {revision.decidedAt && revision.decision !== "withdrawn" ? (
            <p className="text-caption text-muted-foreground">
              Decided by {revision.deciderName ?? "an Admin"} on {formatDateTime(revision.decidedAt, task.timeZone)}
            </p>
          ) : null}
          {revision.comment ? <p className="whitespace-pre-line text-body-xs">{revision.comment}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function ExtraHoursHistory({ task }: { task: TaskDetail }) {
  if (task.extraHours.length === 0) {
    return <p className="text-body-sm text-muted-foreground">No extra hours requested.</p>;
  }
  return (
    <ol className="divide-y divide-border rounded-lg border border-border">
      {task.extraHours.map((request) => (
        <li key={request.id} className="space-y-1.5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm font-medium numeric">+{formatDuration(request.minutes)}</span>
            <StatusBadge kind="extra-hours" status={request.status} />
          </div>
          <p className="font-mono text-caption text-muted-foreground">
            Requested {formatDateTime(request.createdAt, task.timeZone)}
          </p>
          <p className="whitespace-pre-line text-body-xs">{request.reason}</p>
          {request.decisionReason ? (
            <p className="whitespace-pre-line text-body-xs text-muted-foreground">
              {request.deciderName ?? "An Admin"}: {request.decisionReason}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ActivityHistory({ task }: { task: TaskDetail }) {
  if (task.history.length === 0) {
    return <p className="text-body-sm text-muted-foreground">Nothing recorded yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {task.history.map((entry) => (
        <li key={entry.id} className="space-y-0.5 border-b border-border pb-3 last:border-0">
          <p className="text-body-xs">{entry.text}</p>
          {entry.detail ? (
            <p className="whitespace-pre-line break-words text-caption text-muted-foreground">{entry.detail}</p>
          ) : null}
          <p className="font-mono text-caption text-muted-foreground">
            {formatDateTime(entry.occurredAt, task.timeZone)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function sameEstimate(a: { minMinutes: number; maxMinutes: number }, b: { minMinutes: number; maxMinutes: number }) {
  return a.minMinutes === b.minMinutes && a.maxMinutes === b.maxMinutes;
}
