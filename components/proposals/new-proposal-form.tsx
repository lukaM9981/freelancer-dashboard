"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEstimateRange, formatMoney, formatMoneyRange } from "@/lib/format";
import type { DisplayRate } from "@/lib/people/rates";
import { submitProposal } from "@/lib/proposals/actions";
import { costRange, sumEstimates } from "@/lib/proposals/figures";
import type { ProposableTask } from "@/lib/proposals/queries";

type NewProposalFormProps = {
  projectId: string;
  tasks: ProposableTask[];
  rate: DisplayRate | null;
  preselected: string[];
};

export function NewProposalForm({ projectId, tasks, rate, preselected }: NewProposalFormProps) {
  const router = useRouter();
  const selectable = tasks.filter((task) => task.estimate != null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preselected.filter((id) => selectable.some((task) => task.id === id))),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = selectable.filter((task) => selected.has(task.id));
  const totals = sumEstimates(chosen.flatMap((task) => (task.estimate ? [task.estimate] : [])));
  const cost = costRange(totals, rate);
  const allSelected = selectable.length > 0 && chosen.length === selectable.length;

  function toggle(taskId: string, checked: boolean) {
    setError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setError(null);
    setSelected(checked ? new Set(selectable.map((task) => task.id)) : new Set());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (chosen.length === 0) {
      setError("Select at least one task.");
      return;
    }
    setPending(true);
    const result = await submitProposal({ projectId, taskIds: chosen.map((task) => task.id) });
    if (!result.ok) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    toast.success(chosen.length === 1 ? "Task submitted for approval." : `${chosen.length} tasks submitted for approval.`);
    router.push(`/approvals/${result.data.proposalId}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <Table>
        <caption className="sr-only">Tasks you can submit</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={chosen.length > 0 && !allSelected}
                disabled={selectable.length === 0}
                onCheckedChange={(checked) => toggleAll(checked)}
                aria-label="Select every task with an estimate"
              />
            </TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Estimate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const checkboxId = `task-${task.id}`;
            return (
              <TableRow key={task.id}>
                <TableCell data-label="" className="max-md:justify-start">
                  <Checkbox
                    id={checkboxId}
                    checked={selected.has(task.id)}
                    disabled={task.estimate == null || pending}
                    onCheckedChange={(checked) => toggle(task.id, checked)}
                    aria-describedby={task.estimate == null ? `${checkboxId}-hint` : undefined}
                  />
                </TableCell>
                <TableCell data-label="Task" className="md:max-w-96 md:whitespace-normal">
                  <label htmlFor={checkboxId} className="font-medium">
                    {task.title}
                  </label>
                  {task.estimate?.note ? (
                    <span className="block text-caption whitespace-pre-line text-muted-foreground">
                      {task.estimate.note}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell data-label="Status">
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell data-label="Estimate" className="numeric md:text-right">
                  {task.estimate ? (
                    formatEstimateRange(task.estimate.minMinutes, task.estimate.maxMinutes)
                  ) : (
                    <span id={`${checkboxId}-hint`}>
                      No estimate yet.{" "}
                      <Link
                        href={`/tasks/${task.id}/edit`}
                        className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                      >
                        Add one
                      </Link>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <section className="space-y-4" aria-live="polite">
        <h2 className="text-heading-xs">Totals</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Selected tasks" value={String(chosen.length)} />
          <StatCard
            label="Estimate"
            value={chosen.length > 0 ? formatEstimateRange(totals.minMinutes, totals.maxMinutes) : "\u2014"}
          />
          <StatCard
            label="Cost at your rate"
            value={cost && chosen.length > 0 ? formatMoneyRange(cost.min, cost.max) : rate ? "\u2014" : "No rate"}
          />
        </div>
        <p className="text-body-sm text-muted-foreground">
          {rate
            ? `Priced at your current rate of ${formatMoney(rate.cents, rate.currency)} / h. Planning uses the maximum.`
            : "You don't have a rate yet, so no cost is shown. Olifant sets your rate."}
        </p>
      </section>

      {error ? (
        <p role="alert" className="text-body-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={`/projects/${projectId}`} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <SubmitButton pending={pending}>Submit Proposal</SubmitButton>
      </div>
    </form>
  );
}
