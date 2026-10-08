import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ApproveAllButton, ItemDecisionButtons, WithdrawButton } from "@/components/proposals/proposal-actions";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getViewer, requireViewer } from "@/lib/auth/queries";
import { formatDateTime, formatEstimateRange, formatMoney, formatMoneyRange } from "@/lib/format";
import { getProposal, type ProposalDetail, type ProposalItem } from "@/lib/proposals/queries";
import { cn } from "@/lib/utils";

type ProposalPageProps = { params: Promise<{ proposalId: string }> };

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { proposalId } = await params;
  const viewer = await getViewer();
  const proposal = viewer ? await getProposal(proposalId, viewer) : null;
  return { title: `Proposal${proposal ? ` · ${proposal.project.name}` : ""} · Olifant Workboard` };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const viewer = await requireViewer();
  const { proposalId } = await params;
  const proposal = await getProposal(proposalId, viewer);
  if (!proposal) notFound();

  const isAdmin = viewer.role === "admin";
  const withdrawable = proposal.items.filter((item) => item.canWithdraw).map((item) => item.revisionId);
  const backHref = isAdmin ? "/approvals" : `/projects/${proposal.project.id}`;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader
          eyebrow={proposal.project.name}
          title={isAdmin ? `Proposal from ${proposal.submitterName ?? "Unknown person"}` : "Your proposal"}
          action={
            proposal.canApproveAll ? (
              <ApproveAllButton proposalId={proposal.id} count={proposal.pendingCount} />
            ) : withdrawable.length > 1 ? (
              <WithdrawButton proposalId={proposal.id} revisionIds={withdrawable} label="Withdraw Remaining" />
            ) : undefined
          }
        />
      </div>

      <div className="space-y-1 text-body-sm">
        <p className="font-mono text-caption text-muted-foreground">
          Submitted {formatDateTime(proposal.submittedAt, proposal.timeZone)}
        </p>
        <p>
          <ProgressLine proposal={proposal} />
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Totals</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Items" value={String(proposal.items.length)} />
          <StatCard
            label="Estimate"
            value={
              proposal.totals.maxMinutes > 0
                ? formatEstimateRange(proposal.totals.minMinutes, proposal.totals.maxMinutes)
                : "\u2014"
            }
          />
          <StatCard
            label="Cost range"
            value={
              proposal.cost && proposal.totals.maxMinutes > 0
                ? formatMoneyRange(proposal.cost.min, proposal.cost.max)
                : proposal.rate
                  ? "\u2014"
                  : "No rate"
            }
          />
        </div>
        <p className="text-body-sm text-muted-foreground">
          {proposal.rate
            ? `At ${isAdmin ? "the freelancer's" : "your"} current rate of ${formatMoney(proposal.rate.cents, proposal.rate.currency)} / h. Withdrawn items are left out.`
            : isAdmin
              ? "This freelancer has no rate yet, so no cost is shown."
              : "You don't have a rate yet, so no cost is shown."}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Items</h2>
        <ItemsTable proposal={proposal} />
      </section>
    </div>
  );
}

function ProgressLine({ proposal }: { proposal: ProposalDetail }) {
  if (proposal.pendingCount === 0) {
    return <>Complete: every item has been decided or withdrawn.</>;
  }
  return (
    <>
      <span className="numeric">{proposal.pendingCount === 1 ? "1 item is" : `${proposal.pendingCount} items are`}</span>{" "}
      waiting for a decision.
    </>
  );
}

function ItemsTable({ proposal }: { proposal: ProposalDetail }) {
  const showActions = proposal.items.some((item) => item.canDecide || item.canWithdraw);
  return (
    <Table>
      <caption className="sr-only">Items in this proposal</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead className="text-right">Estimate</TableHead>
          <TableHead>Status</TableHead>
          {showActions ? (
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {proposal.items.map((item) => (
          <TableRow key={item.revisionId} className="md:align-top">
            <TableCell data-label="Task" className="max-md:block md:max-w-xl md:py-3 md:whitespace-normal">
              <ItemDetails item={item} proposal={proposal} />
            </TableCell>
            <TableCell data-label="Estimate" className="numeric md:py-3 md:text-right md:align-top">
              {formatEstimateRange(item.minMinutes, item.maxMinutes)}
            </TableCell>
            <TableCell data-label="Status" className="md:py-3 md:align-top">
              <StatusBadge kind="revision" status={item.decision} />
            </TableCell>
            {showActions ? (
              <TableCell data-label="" className="md:py-3 md:align-top">
                <div className="flex md:justify-end">
                  {item.canDecide ? (
                    <ItemDecisionButtons
                      proposalId={proposal.id}
                      revisionId={item.revisionId}
                      taskTitle={item.taskTitle}
                    />
                  ) : item.canWithdraw ? (
                    <WithdrawButton
                      proposalId={proposal.id}
                      revisionIds={[item.revisionId]}
                      label="Withdraw"
                      size="sm"
                    />
                  ) : null}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ItemDetails({ item, proposal }: { item: ProposalItem; proposal: ProposalDetail }) {
  return (
    <div className="space-y-2">
      <Link
        href={`/tasks/${item.taskId}`}
        className="rounded-sm text-body-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
      >
        {item.taskTitle}
      </Link>
      {item.taskDescription ? (
        <p className="whitespace-pre-line break-words text-body-xs text-muted-foreground">{item.taskDescription}</p>
      ) : null}
      {item.note ? (
        <p className="whitespace-pre-line break-words text-body-xs">
          <span className="font-medium">Estimate note: </span>
          {item.note}
        </p>
      ) : null}
      {item.decidedAt && item.decision !== "pending" && item.decision !== "withdrawn" ? (
        <p className="text-caption text-muted-foreground">
          Decided{item.deciderName ? ` by ${item.deciderName}` : ""} on{" "}
          {formatDateTime(item.decidedAt, proposal.timeZone)}
        </p>
      ) : null}
      {item.comment ? <p className="whitespace-pre-line break-words text-body-xs">{item.comment}</p> : null}
    </div>
  );
}
