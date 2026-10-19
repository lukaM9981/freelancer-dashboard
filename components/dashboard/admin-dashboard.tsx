import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { PersonAvatar } from "@/components/person-avatar";
import { StatCard } from "@/components/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDashboard as AdminDashboardData } from "@/lib/dashboard/queries";
import type { TimeBreakdown } from "@/lib/dashboard/figures";
import { formatAmounts, formatDateTime, formatDuration, formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const costs =
    data.month.amounts.length > 0
      ? data.month.amounts.map((amount) => formatMoney(amount.cents, amount.currency))
      : [formatMoney(0, data.defaultCurrency)];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting for a decision" value={String(data.waitingTotal)} />
        <StatCard label="Tracking now" value={String(data.trackingNow)} />
        <StatCard label={`Counted in ${data.monthLabel}`} value={formatDuration(data.month.countedMinutes)} />
        <StatCard label={`Cost in ${data.monthLabel}`} values={costs} />
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
      </section>

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
                {withAvatar ? <PersonAvatar name={row.name} src={row.avatarUrl} /> : null}
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
