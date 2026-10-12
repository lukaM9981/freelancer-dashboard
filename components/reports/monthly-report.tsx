import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PersonFilter } from "@/components/reports/person-filter";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { OverLimit } from "@/components/time/entry-source";
import { MonthNav } from "@/components/time/month-nav";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/queries";
import { formatAmounts, formatDuration, formatMoney, formatMonth } from "@/lib/format";
import { csvPath, reportPath } from "@/lib/reports/paths";
import { getMonthlyReport, isMonthParam, type MonthlyReport, type ReportSection } from "@/lib/reports/queries";

export async function MonthlyReport({
  monthParam,
  userParam,
}: {
  monthParam?: string;
  userParam?: string;
}) {
  if (monthParam && !isMonthParam(monthParam)) notFound();
  const viewer = await requireViewer();
  const report = await getMonthlyReport(viewer, monthParam, userParam);
  if ("redirectTo" in report) redirect(report.redirectTo);

  const monthHrefs = Object.fromEntries(
    report.months.map((item) => [item.value, reportPath(item.value, report.currentMonth, report.selectedUserId)]),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reports"
        title={formatMonth(report.month)}
        action={
          <form action={csvPath(report.month, null)} method="get" className="w-full lg:w-fit">
            {report.selectedUserId ? <input type="hidden" name="user" value={report.selectedUserId} /> : null}
            <Button type="submit">Export CSV</Button>
          </form>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <MonthNav
          months={report.months}
          month={report.month}
          currentMonth={report.currentMonth}
          hrefs={monthHrefs}
        />
        {viewer.role === "admin" && report.people.length > 0 ? (
          <PersonFilter
            people={report.people}
            selectedUserId={report.selectedUserId}
            month={report.month}
            currentMonth={report.currentMonth}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="month" status={report.closed ? "closed" : "open"} />
          {report.closed ? null : <Badge variant="outline">Not final</Badge>}
        </div>
        <p className="text-body-sm text-muted-foreground">
          {report.closed
            ? "These amounts are frozen."
            : "This is a live preview. Amounts freeze when the month is closed."}
        </p>
      </div>

      {report.sections.length === 0 ? (
        <EmptyState
          title="No time this month"
          description="This report fills in once time is tracked."
        />
      ) : (
        <>
          <ReportTotals report={report} />
          <div className="space-y-8">
            {report.sections.map((section) => (
              <ReportTable key={section.userId} section={section} showName={viewer.role === "admin"} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReportTotals({ report }: { report: MonthlyReport }) {
  return (
    <section className="space-y-4">
      <h2 className="sr-only">Totals</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Counted" value={formatDuration(report.countedMinutes)} />
        {report.amounts.length > 0 ? (
          <StatCard label="Amount" values={report.amounts.map((amount) => formatMoney(amount.cents, amount.currency))} />
        ) : null}
        {report.overLimitMinutes > 0 ? (
          <StatCard label="Over limit, unpaid" value={formatDuration(report.overLimitMinutes)} />
        ) : null}
      </div>
    </section>
  );
}

function ReportTable({ section, showName }: { section: ReportSection; showName: boolean }) {
  return (
    <section className="space-y-3">
      {showName ? <h2 className="text-heading-xs">{section.fullName}</h2> : <h2 className="sr-only">Your report</h2>}
      <Table>
        <caption className="sr-only">
          {showName ? `${section.fullName}'s time` : "Your time"} in this month
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead className="text-right">Counted</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Over limit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.rows.map((row) => (
            <TableRow key={`${row.taskId}-${row.rateId ?? "none"}`}>
              <TableCell data-label="Task" className="font-medium md:max-w-64 md:whitespace-normal">
                <Link
                  href={`/tasks/${row.taskId}`}
                  className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                >
                  {row.taskTitle}
                </Link>
                <span className="mt-0.5 block text-caption text-muted-foreground">{row.projectName}</span>
              </TableCell>
              <TableCell data-label="Counted" className="numeric md:text-right">
                {formatDuration(row.countedMinutes)}
              </TableCell>
              <TableCell data-label="Rate" className="numeric md:text-right">
                {row.hourlyRateCents != null && row.currency
                  ? `${formatMoney(row.hourlyRateCents, row.currency)}/h`
                  : "No rate"}
              </TableCell>
              <TableCell data-label="Amount" className="numeric md:text-right">
                {row.currency ? formatMoney(row.amountCents, row.currency) : "\u2014"}
              </TableCell>
              <TableCell data-label="Over limit" className="md:text-right">
                <OverLimit minutes={row.overLimitMinutes} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-body-sm">
        <span className="text-muted-foreground">Total </span>
        <span className="numeric">{formatDuration(section.countedMinutes)}</span>
        {section.amounts.length > 0 ? (
          <span className="numeric"> · {formatAmounts(section.amounts)}</span>
        ) : null}
        {section.overLimitMinutes > 0 ? (
          <span className="numeric text-error"> · {formatDuration(section.overLimitMinutes)} over limit, unpaid</span>
        ) : null}
      </p>
      {section.missingRate ? (
        <p className="text-body-sm text-muted-foreground">
          Counted time with no rate isn&apos;t included in the amount.
          {showName ? " Add a rate that covers those dates." : null}
        </p>
      ) : null}
    </section>
  );
}
