import Link from "next/link";
import { CircleAlertIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";
import { QueueKindBadge, QueueSummary, queueItemHref } from "@/components/approvals/queue-item";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { TrackingNow } from "@/components/dashboard/tracking-now";
import { PersonAvatar } from "@/components/person-avatar";
import { StatCard } from "@/components/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDashboard as AdminDashboardData } from "@/lib/dashboard/queries";
import type { TimeBreakdown } from "@/lib/dashboard/figures";
import type { RiskKind } from "@/lib/dashboard/risks";
import { formatAge, formatAmounts, formatDateTime, formatDuration, formatMoney, formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AdminDashboard({ data, serverNow }: { data: AdminDashboardData; serverNow: string }) {
  const costs =
    data.month.amounts.length > 0
      ? data.month.amounts.map((amount) => formatMoney(amount.cents, amount.currency))
      : [formatMoney(0, data.defaultCurrency)];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting for a decision" value={String(data.waiting.total)} />
        <StatCard label="Tracking now" value={String(data.tracking.length)} />
        <StatCard label={`Counted in ${data.monthLabel}`} value={formatDuration(data.month.countedMinutes)} />
        <StatCard label={`Cost in ${data.monthLabel}`} values={costs} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          id="waiting-heading"
          title="Waiting for a decision"
          brand
          description={
            data.waiting.total > data.waiting.items.length
              ? `The ${data.waiting.items.length} oldest of ${data.waiting.total}.`
              : data.waiting.total > 0
                ? "Oldest first."
                : undefined
          }
          action={
            data.waiting.total > 0 ? (
              <Link href="/approvals" className={buttonVariants({ variant: "outline", size: "sm" })}>
                View All
              </Link>
            ) : null
          }
        >
          {data.waiting.items.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">Nothing waiting for you.</p>
          ) : (
            <ol className="-mx-2 divide-y divide-border">
              {data.waiting.items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={queueItemHref(item)}
                    className="block rounded-sm px-2 py-3 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <p className="eyebrow">{item.projectName}</p>
                      <p className="text-caption text-muted-foreground">
                        <span className="sr-only">Waiting </span>
                        <time
                          dateTime={item.waitingSince}
                          title={formatDateTime(item.waitingSince, data.timeZone)}
                          className="numeric"
                        >
                          {formatAge(item.waitingSince)}
                        </time>
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-body-sm font-bold">{item.personName}</span>
                      <QueueKindBadge item={item} className="ml-auto" />
                    </div>
                    <p className="mt-1 text-body-sm">
                      <QueueSummary item={item} />
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </DashboardCard>

        <DashboardCard id="tracking-heading" title="Tracking now">
          <TrackingNow timers={data.tracking} serverNow={serverNow} />
        </DashboardCard>
      </div>

      <section aria-labelledby="month-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="month-heading" className="text-heading-xs">
            This month
          </h2>
          <p className="text-body-sm text-muted-foreground">
            {data.monthLabel}, a preview until the month is closed.
            {data.month.overLimitMinutes > 0 ? (
              <>
                {" "}
                <span className="numeric">{formatDuration(data.month.overLimitMinutes)}</span> over limit, unpaid.
              </>
            ) : null}
            {data.month.missingRate ? " Some counted time has no rate yet, so its cost is missing." : null}
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardCard id="per-freelancer-heading" title="Per freelancer">
            <BreakdownTable
              rows={data.month.freelancers}
              label="Freelancer"
              caption="Counted time and cost per freelancer this month"
              empty="No time tracked this month yet."
              hrefOf={(row) => `/reports?user=${encodeURIComponent(row.id)}`}
              withAvatar
            />
          </DashboardCard>
          <DashboardCard id="per-project-heading" title="Per project">
            <BreakdownTable
              rows={data.month.projects}
              label="Project"
              caption="Counted time and cost per project this month"
              empty="No time tracked this month yet."
              hrefOf={(row) => `/projects/${row.id}`}
            />
          </DashboardCard>
        </div>
        <DashboardCard
          id="estimates-heading"
          title="Estimated versus actual"
          description="Approved limits against all counted time on Approved, In progress, On hold, and Done tasks."
        >
          {data.estimates.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No open tasks with an approved estimate.</p>
          ) : (
            <Table>
              <caption className="sr-only">Approved limits against counted time on open tasks, per project</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Open tasks</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Over limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.estimates.map((row) => (
                  <TableRow key={row.projectId}>
                    <TableCell data-label="Project" className="font-medium md:max-w-80 md:whitespace-normal">
                      <Link
                        href={`/projects/${row.projectId}`}
                        className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                      >
                        {row.projectName}
                      </Link>
                    </TableCell>
                    <TableCell data-label="Open tasks" className="numeric md:text-right">
                      {row.taskCount}
                    </TableCell>
                    <TableCell data-label="Approved" className="numeric md:text-right">
                      {formatDuration(row.approvedMinutes)}
                    </TableCell>
                    <TableCell data-label="Counted" className="numeric md:text-right">
                      {formatDuration(row.countedMinutes)}
                    </TableCell>
                    <TableCell data-label="Used" className="numeric md:text-right">
                      {row.approvedMinutes > 0
                        ? formatPercent(Math.floor((row.countedMinutes * 100) / row.approvedMinutes))
                        : "\u2014"}
                    </TableCell>
                    <TableCell
                      data-label="Over limit"
                      className={cn("numeric md:text-right", row.overLimitMinutes > 0 && "text-error")}
                    >
                      {row.overLimitMinutes > 0 ? formatDuration(row.overLimitMinutes) : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DashboardCard>
      </section>

      <DashboardCard id="risks-heading" title="Overruns and risks">
        {data.risks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No overruns or risks right now.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {data.risks.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="flex flex-col gap-1 rounded-sm px-2 py-3 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring md:flex-row md:items-start md:justify-between md:gap-6"
                >
                  <div className="min-w-0">
                    <p className="eyebrow truncate">
                      {row.projectName}
                      {row.personName ? ` \u00b7 ${row.personName}` : ""}
                    </p>
                    <p className="text-body-sm font-medium">{row.title}</p>
                  </div>
                  <ul className="flex shrink-0 flex-col gap-1 md:items-end">
                    {row.notes.map((note) => (
                      <li key={note.kind} className={cn("flex items-center gap-1 text-caption", noteTone[note.kind])}>
                        <RiskIcon kind={note.kind} />
                        <span className="numeric">{note.text}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard id="activity-heading" title="Team activity" description="Time entries and decisions from the last seven days.">
        {data.activity.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No time entries or decisions in the last seven days.</p>
        ) : (
          <ol className="-mx-2 divide-y divide-border">
            {data.activity.map((item) => {
              const body = (
                <>
                  <p className="text-body-sm">{item.text}</p>
                  {item.detail ? (
                    <p className="mt-0.5 whitespace-pre-line text-body-xs text-muted-foreground">{item.detail}</p>
                  ) : null}
                  <p className="mt-1 text-caption text-muted-foreground">
                    {item.projectName ? `${item.projectName} \u00b7 ` : ""}
                    <time dateTime={item.occurredAt} title={formatDateTime(item.occurredAt, data.timeZone)}>
                      {formatRelative(item.occurredAt, data.timeZone)}
                    </time>
                  </p>
                </>
              );
              return (
                <li key={item.key}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded-sm px-2 py-3 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-2 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </DashboardCard>
    </div>
  );
}

const noteTone: Record<RiskKind, string> = {
  over_limit: "text-error",
  extra_hours: "text-yellow-800",
  slow_decision: "text-muted-foreground",
  near_limit: "text-yellow-800",
  stalled: "text-muted-foreground",
};

function RiskIcon({ kind }: { kind: RiskKind }) {
  const Icon = kind === "over_limit" ? CircleAlertIcon : kind === "slow_decision" || kind === "stalled" ? ClockIcon : TriangleAlertIcon;
  return <Icon className="size-3.5 shrink-0" aria-hidden="true" />;
}

function BreakdownTable({
  rows,
  label,
  caption,
  empty,
  hrefOf,
  withAvatar,
}: {
  rows: TimeBreakdown[];
  label: string;
  caption: string;
  empty: string;
  hrefOf: (row: TimeBreakdown) => string;
  withAvatar?: boolean;
}) {
  if (rows.length === 0) return <p className="text-body-sm text-muted-foreground">{empty}</p>;
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>{label}</TableHead>
          <TableHead className="text-right">Counted</TableHead>
          <TableHead className="text-right">Over limit</TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell data-label={label} className="font-medium md:max-w-64 md:whitespace-normal">
              <span className="inline-flex items-center gap-2">
                {withAvatar ? <PersonAvatar name={row.name} /> : null}
                <Link href={hrefOf(row)} className="rounded-sm text-link underline-offset-4 hover:underline focus-ring">
                  {row.name}
                </Link>
              </span>
            </TableCell>
            <TableCell data-label="Counted" className="numeric md:text-right">
              {formatDuration(row.countedMinutes)}
            </TableCell>
            <TableCell data-label="Over limit" className={cn("numeric md:text-right", row.overLimitMinutes > 0 && "text-error")}>
              {row.overLimitMinutes > 0 ? formatDuration(row.overLimitMinutes) : "\u2014"}
            </TableCell>
            <TableCell data-label="Cost" className="numeric md:text-right">
              {row.amounts.length > 0 ? formatAmounts(row.amounts) : null}
              {row.missingRate ? (
                <span className="text-muted-foreground">{row.amounts.length > 0 ? " \u00b7 no rate" : "No rate"}</span>
              ) : null}
              {row.amounts.length === 0 && !row.missingRate ? "\u2014" : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
