import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth/queries";
import { formatAge, formatDateTime, formatDuration, formatEstimateRange, formatMoneyRange } from "@/lib/format";
import { listApprovalQueue, type QueueItem } from "@/lib/proposals/queries";

export const metadata: Metadata = { title: "Approvals · Olifant Workboard" };

export default async function ApprovalsPage() {
  await requireAdmin();
  const { items, timeZone } = await listApprovalQueue();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Approvals" />
      {items.length === 0 ? (
        <EmptyState
          title="Nothing waiting for you"
          description="New proposals from freelancers will show up here."
        />
      ) : (
        <>
          <p className="text-body-sm text-muted-foreground">
            <span className="numeric">{items.length}</span> waiting for a decision, oldest first.
          </p>
          <ol className="space-y-4">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <QueueCard item={item} timeZone={timeZone} />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function QueueCard({ item, timeZone }: { item: QueueItem; timeZone: string }) {
  const href = item.kind === "proposal" ? `/approvals/${item.id}` : `/tasks/${item.taskId}`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-card p-4 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p className="eyebrow">{item.projectName}</p>
        <p className="text-caption text-muted-foreground">
          <span className="sr-only">Waiting </span>
          <time dateTime={item.waitingSince} title={formatDateTime(item.waitingSince, timeZone)} className="numeric">
            {formatAge(item.waitingSince)}
          </time>
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <PersonAvatar name={item.personName} />
        <span className="text-body-sm font-bold">{item.personName}</span>
        <KindLabel item={item} />
      </div>
      <p className="mt-3 text-body-sm">
        <Summary item={item} />
      </p>
    </Link>
  );
}

function KindLabel({ item }: { item: QueueItem }) {
  if (item.kind === "proposal") return <StatusBadge kind="revision" status="pending" className="ml-auto" />;
  if (item.kind === "extra_hours") return <StatusBadge kind="extra-hours" status="pending" className="ml-auto" />;
  return <StatusBadge status="done" className="ml-auto" />;
}

function Summary({ item }: { item: QueueItem }) {
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
