import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardTimer } from "@/components/dashboard/dashboard-timer";
import { HoursMeter } from "@/components/hours-meter";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { StartTimerButton } from "@/components/timer/start-timer-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FreelancerDashboard as FreelancerDashboardData } from "@/lib/dashboard/queries";
import { formatDate, formatDuration, formatEstimateRange, formatMoney } from "@/lib/format";

export function FreelancerDashboard({ data }: { data: FreelancerDashboardData }) {
  const earnings =
    data.month.amounts.length > 0
      ? data.month.amounts.map((amount) => formatMoney(amount.cents, amount.currency))
      : [data.month.missingRate ? "No rate" : formatMoney(0, data.defaultCurrency)];
  const canStart = data.activeTasks.some((task) => task.trackable);

  return (
    <div className="space-y-8">
      <section aria-labelledby="my-month-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div className="space-y-1">
            <h2 id="my-month-heading" className="text-heading-xs">
              My month
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {data.monthLabel}, a preview until the month is closed.
              {data.month.overLimitMinutes > 0 ? (
                <>
                  {" "}
                  <span className="numeric">{formatDuration(data.month.overLimitMinutes)}</span> over limit, unpaid.
                </>
              ) : null}
              {data.month.missingRate ? " Some of your time has no rate yet." : null}
            </p>
          </div>
          <Link
            href={data.reportHref}
            className="rounded-sm text-body-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
          >
            View report
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Counted this month" value={formatDuration(data.month.countedMinutes)} />
          <StatCard label="Earnings this month" values={earnings} />
          <StatCard label="Active tasks" value={String(data.activeTasks.length)} />
          <StatCard label="Waiting for my estimate" value={String(data.waitingForEstimate.length)} />
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DashboardTimer canStart={canStart} />

        <DashboardCard id="estimate-heading" title="Waiting for my estimate">
          {data.waitingForEstimate.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No tasks waiting for your estimate.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-border">
              {data.waitingForEstimate.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="flex items-start justify-between gap-4 rounded-sm px-2 py-3 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring"
                  >
                    <div className="min-w-0">
                      <p className="eyebrow truncate">{task.projectName}</p>
                      <p className="text-body-sm font-medium">{task.title}</p>
                      <p className="text-caption text-muted-foreground numeric">
                        {task.estimate
                          ? `Estimate ${formatEstimateRange(task.estimate.minMinutes, task.estimate.maxMinutes)}, not submitted`
                          : "No estimate yet"}
                      </p>
                    </div>
                    <StatusBadge status={task.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <DashboardCard id="active-heading" title="My active tasks" description="Approved and In progress tasks, with the time left before the limit.">
        {data.activeTasks.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No Approved or In progress tasks right now.</p>
        ) : (
          <Table>
            <caption className="sr-only">Your Approved and In progress tasks</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-72">Time</TableHead>
                {canStart ? (
                  <TableHead>
                    <span className="sr-only">Timer</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.activeTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell data-label="Task" className="font-medium md:max-w-80 md:whitespace-normal">
                    <span className="flex flex-col max-md:items-end">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                      >
                        {task.title}
                      </Link>
                      <span className="text-caption font-normal text-muted-foreground">{task.projectName}</span>
                    </span>
                  </TableCell>
                  <TableCell data-label="Status">
                    <StatusBadge status={task.status} />
                  </TableCell>
                  <TableCell data-label="Time" className="max-md:flex-col max-md:items-stretch md:py-2">
                    <HoursMeter
                      countedMinutes={task.countedMinutes}
                      limitMinutes={task.limitMinutes}
                      ceilingMinutes={task.ceilingMinutes}
                      requestHref={task.extraHoursPending ? undefined : `/tasks/${task.id}`}
                      overLimitNote={task.extraHoursPending ? "Extra hours requested" : undefined}
                      className="md:w-72"
                    />
                  </TableCell>
                  {canStart ? (
                    <TableCell className="md:text-right">
                      {task.trackable ? (
                        <StartTimerButton
                          variant="icon"
                          task={{ id: task.id, title: task.title, projectName: task.projectName }}
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DashboardCard>

      <DashboardCard
        id="proposals-heading"
        title="My proposals"
        description="Items waiting for a decision, and those decided in the last 30 days."
      >
        {data.proposals.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No proposals waiting or decided recently.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-border">
            {data.proposals.map((item) => (
              <li key={item.revisionId}>
                <Link
                  href={`/approvals/${item.proposalId}`}
                  className="flex items-start justify-between gap-4 rounded-sm px-2 py-3 transition-colors duration-150 ease-brand hover:bg-muted/50 focus-ring"
                >
                  <div className="min-w-0">
                    <p className="eyebrow truncate">{item.projectName}</p>
                    <p className="text-body-sm font-medium">{item.taskTitle}</p>
                    <p className="text-caption text-muted-foreground numeric">
                      {formatEstimateRange(item.minMinutes, item.maxMinutes)}
                      {" \u00b7 "}
                      {item.decision === "pending" ? "Submitted " : "Decided "}
                      <time dateTime={item.at}>{formatDate(item.at, data.timeZone)}</time>
                    </p>
                  </div>
                  <StatusBadge kind="revision" status={item.decision} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
