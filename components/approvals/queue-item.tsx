import { StatusBadge } from "@/components/status-badge";
import { formatDuration, formatEstimateRange, formatMoneyRange } from "@/lib/format";
import type { QueueItem } from "@/lib/proposals/queries";

export function queueItemHref(item: QueueItem): string {
  return item.kind === "proposal" ? `/approvals/${item.id}` : `/tasks/${item.taskId}`;
}

export function QueueKindBadge({ item, className }: { item: QueueItem; className?: string }) {
  if (item.kind === "proposal") return <StatusBadge kind="revision" status="pending" className={className} />;
  if (item.kind === "extra_hours") return <StatusBadge kind="extra-hours" status="pending" className={className} />;
  return <StatusBadge status="done" className={className} />;
}

export function QueueSummary({ item }: { item: QueueItem }) {
  if (item.kind === "proposal") {
    return (
      <>
        <span className="font-medium">Proposal</span>
        {" \u00b7 "}
        <span className="numeric">
          {item.itemCount === 1 ? "1 item" : `${item.itemCount} items`}
          {" \u00b7 "}
          {formatEstimateRange(item.range.minMinutes, item.range.maxMinutes)}
          {" \u00b7 "}
          {item.cost ? formatMoneyRange(item.cost.min, item.cost.max) : "No rate"}
        </span>
      </>
    );
  }
  if (item.kind === "extra_hours") {
    return (
      <>
        <span className="font-medium">Extra-hours request</span>
        {" \u00b7 "}
        <span className="numeric">+{formatDuration(item.minutes)}</span>
        {" on "}
        {item.taskTitle}
      </>
    );
  }
  return (
    <>
      <span className="font-medium">Marked Done</span>
      {" \u00b7 "}
      {item.taskTitle}
    </>
  );
}
