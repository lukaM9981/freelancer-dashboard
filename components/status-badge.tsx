import {
  BadgeCheck,
  Ban,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Clock,
  Flag,
  Lock,
  LockOpen,
  RotateCcw,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const TASK_STATUSES = [
  "draft",
  "pending_approval",
  "changes_requested",
  "approved",
  "in_progress",
  "on_hold",
  "done",
  "accepted",
  "rejected",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ExtraHoursStatus = "pending" | "approved" | "rejected" | "cancelled";
export type RevisionDecision = "pending" | "approved" | "rejected" | "changes_requested" | "withdrawn";
export type MonthStatus = "open" | "closed";

type Look = { label: string; icon: LucideIcon; className: string };

const taskLooks: Record<TaskStatus, Look> = {
  draft: {
    label: "Draft",
    icon: CircleDashed,
    className: "bg-white text-foreground ring-1 ring-inset ring-border",
  },
  pending_approval: {
    label: "Pending approval",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800",
  },
  changes_requested: {
    label: "Changes requested",
    icon: RotateCcw,
    className: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-300",
  },
  approved: {
    label: "Approved",
    icon: CircleCheck,
    className: "bg-pine-100 text-pine-700",
  },
  in_progress: {
    label: "In progress",
    icon: Timer,
    className: "bg-info-subtle text-info",
  },
  on_hold: {
    label: "On hold",
    icon: CirclePause,
    className: "bg-muted text-neutral-600",
  },
  done: {
    label: "Done",
    icon: Flag,
    className: "bg-yellow-100 text-yellow-800",
  },
  accepted: {
    label: "Accepted",
    icon: BadgeCheck,
    className:
      "bg-success-subtle text-foreground ring-1 ring-inset ring-success-border [&_svg]:text-success",
  },
  rejected: {
    label: "Rejected",
    icon: CircleX,
    className:
      "bg-error-subtle text-foreground ring-1 ring-inset ring-error-border [&_svg]:text-error",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "bg-muted text-muted-foreground",
  },
};

const extraHoursLooks: Record<ExtraHoursStatus, Look> = {
  pending: { ...taskLooks.pending_approval, label: "Pending" },
  approved: taskLooks.approved,
  rejected: taskLooks.rejected,
  cancelled: taskLooks.cancelled,
};

/** Estimate revisions are proposal items, which look like tasks (Design.md §5.1). */
const revisionLooks: Record<RevisionDecision, Look> = {
  pending: { ...taskLooks.pending_approval, label: "Pending" },
  approved: taskLooks.approved,
  rejected: taskLooks.rejected,
  changes_requested: taskLooks.changes_requested,
  withdrawn: { ...taskLooks.cancelled, label: "Withdrawn" },
};

const monthLooks: Record<MonthStatus, Look> = {
  open: {
    label: "Open",
    icon: LockOpen,
    className: "bg-white text-foreground ring-1 ring-inset ring-border",
  },
  closed: {
    label: "Closed",
    icon: Lock,
    className: "bg-secondary text-secondary-foreground",
  },
};

type StatusBadgeProps = { className?: string } & (
  | { kind?: "task"; status: TaskStatus }
  | { kind: "extra-hours"; status: ExtraHoursStatus }
  | { kind: "revision"; status: RevisionDecision }
  | { kind: "month"; status: MonthStatus }
);

export function StatusBadge({ className, ...props }: StatusBadgeProps) {
  const look =
    props.kind === "extra-hours"
      ? extraHoursLooks[props.status]
      : props.kind === "revision"
        ? revisionLooks[props.status]
        : props.kind === "month"
          ? monthLooks[props.status]
          : taskLooks[props.status];
  const Icon = look.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-caption font-medium",
        look.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {look.label}
    </span>
  );
}
