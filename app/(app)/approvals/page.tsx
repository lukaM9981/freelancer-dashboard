import type { Metadata } from "next";
import Link from "next/link";
import { QueueKindBadge, QueueSummary, queueItemHref } from "@/components/approvals/queue-item";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { requireAdmin } from "@/lib/auth/queries";
import { formatAge, formatDateTime } from "@/lib/format";
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
  return (
    <Link
      href={queueItemHref(item)}
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
        <QueueKindBadge item={item} className="ml-auto" />
      </div>
      <p className="mt-3 text-body-sm">
        <QueueSummary item={item} />
      </p>
    </Link>
  );
}
