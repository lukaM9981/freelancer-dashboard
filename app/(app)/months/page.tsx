import type { Metadata } from "next";
import Link from "next/link";
import { MonthActions } from "@/components/months/month-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/queries";
import { ERROR_MESSAGES } from "@/lib/db/errors";
import { formatAmounts, formatDuration } from "@/lib/format";
import { listMonths } from "@/lib/months/queries";
import { reportPath } from "@/lib/reports/paths";

export const metadata: Metadata = { title: "Months · Olifant Workboard" };

export default async function MonthsPage() {
  await requireAdmin();
  const { rows, currentMonth } = await listMonths();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Months" />
      {rows.length === 0 ? (
        <EmptyState title="No months yet" description="Months show up here once time is tracked." />
      ) : (
        <Table>
          <caption className="sr-only">Months, counted time, and amounts</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell data-label="Month" className="font-medium">
                  <Link
                    href={reportPath(row.month, currentMonth, null)}
                    className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                  >
                    {row.label}
                  </Link>
                </TableCell>
                <TableCell data-label="Status">
                  <StatusBadge kind="month" status={row.status} />
                </TableCell>
                <TableCell data-label="Counted" className="md:text-right">
                  <span className="numeric">{formatDuration(row.countedMinutes)}</span>
                  {row.overLimitMinutes > 0 ? (
                    <span className="mt-0.5 block text-caption text-error numeric">
                      {formatDuration(row.overLimitMinutes)} over limit
                    </span>
                  ) : null}
                </TableCell>
                <TableCell data-label="Amount" className="md:text-right">
                  <span className="numeric">
                    {row.amounts.length > 0 ? formatAmounts(row.amounts) : "\u2014"}
                  </span>
                  {row.missingRate ? (
                    <span className="mt-0.5 block text-caption text-muted-foreground">No rate</span>
                  ) : null}
                </TableCell>
                <TableCell data-label="Actions" className="md:max-w-80 md:text-right md:whitespace-normal">
                  {row.canClose || row.canReopen ? (
                    <MonthActions
                      month={row.month}
                      label={row.label}
                      canClose={row.canClose}
                      canReopen={row.canReopen}
                      warnings={row.warnings}
                    />
                  ) : row.blockers.length > 0 ? (
                    <ul className="space-y-1 text-left text-caption text-muted-foreground md:text-right">
                      {row.blockers.map((blocker) => (
                        <li key={blocker}>{ERROR_MESSAGES[blocker]}</li>
                      ))}
                    </ul>
                  ) : row.status === "open" ? (
                    <span className="text-caption text-muted-foreground">Nothing to close</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
