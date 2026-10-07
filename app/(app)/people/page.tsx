import type { Metadata } from "next";
import Link from "next/link";
import { InvitationActions } from "@/components/people/invitation-actions";
import { InviteDialog } from "@/components/people/invite-dialog";
import { PersonStatusBadge, roleLabel } from "@/components/people/labels";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/queries";
import { formatDateTime, formatMoney } from "@/lib/format";
import { listPeople, type PersonListRow } from "@/lib/people/queries";
import { getOrganizationSettings } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "People · Olifant Workboard" };

export default async function PeoplePage() {
  await requireAdmin();
  const [rows, settings] = await Promise.all([listPeople(), getOrganizationSettings()]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="People" action={<InviteDialog />} />
      {rows.length === 0 ? (
        <EmptyState title="No people yet" description="People you invite will show up here." />
      ) : (
        <Table>
          <caption className="sr-only">People and pending invitations</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.kind}-${row.id}`}
                className={row.kind === "person" ? "relative cursor-pointer" : undefined}
              >
                <TableCell data-label="Name">
                  <PersonName row={row} />
                  <p className="text-caption text-muted-foreground">{row.email}</p>
                </TableCell>
                <TableCell data-label="Role">{roleLabel(row.role)}</TableCell>
                <TableCell data-label="Status">
                  <PersonStatusBadge status={row.status} />
                  <InvitationNote row={row} timeZone={settings.timeZone} />
                </TableCell>
                <TableCell data-label="Projects" className="md:whitespace-normal">
                  {row.projects.length > 0 ? row.projects.join(", ") : "—"}
                </TableCell>
                <TableCell data-label="Rate" className="numeric md:text-right">
                  {rateLabel(row)}
                </TableCell>
                <TableCell
                  data-label=""
                  className={row.kind === "person" ? "max-md:justify-end md:text-right" : undefined}
                >
                  {row.kind === "invitation" ? (
                    <InvitationActions invitationId={row.id} fullName={row.fullName} />
                  ) : (
                    <Link
                      href={`/people/${row.id}`}
                      aria-label={`Edit ${row.fullName}`}
                      className={buttonVariants({ variant: "outline", size: "sm", className: "relative z-10" })}
                    >
                      Edit
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function PersonName({ row }: { row: PersonListRow }) {
  if (row.kind === "invitation") return <span className="font-medium">{row.fullName}</span>;
  return (
    <Link
      href={`/people/${row.id}`}
      className="rounded-sm font-medium text-link underline-offset-4 after:absolute after:inset-0 hover:underline focus-ring"
    >
      {row.fullName}
      <span className="sr-only">, open</span>
    </Link>
  );
}

function InvitationNote({ row, timeZone }: { row: PersonListRow; timeZone: string }) {
  if (row.kind !== "invitation" || !row.expiresAt) return null;
  return (
    <p className="mt-1 text-caption text-muted-foreground">
      {row.expired ? "Expired" : "Expires"} {formatDateTime(row.expiresAt, timeZone)}
      {row.emailFailed ? ". The last email didn't send." : ""}
    </p>
  );
}

function rateLabel(row: PersonListRow) {
  if (row.kind === "invitation" || row.role === "admin") return "—";
  if (!row.currentRate) return "No rate";
  return `${formatMoney(row.currentRate.cents, row.currentRate.currency)} / h`;
}
