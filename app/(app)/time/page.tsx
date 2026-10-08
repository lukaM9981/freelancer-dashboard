import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { AddTimeDialog } from "@/components/time/add-time-dialog";
import { EntrySource, OverLimit } from "@/components/time/entry-source";
import { MonthNav } from "@/components/time/month-nav";
import { TimeEntryActions } from "@/components/time/time-entry-actions";
import { StartTimerButton } from "@/components/timer/start-timer-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireFreelancer } from "@/lib/auth/queries";
import { formatCalendarDate, formatDuration } from "@/lib/format";
import { getMyTime } from "@/lib/time/queries";

export const metadata: Metadata = { title: "My time · Olifant Workboard" };

type MyTimePageProps = { searchParams: Promise<{ month?: string | string[] }> };

export default async function MyTimePage({ searchParams }: MyTimePageProps) {
  const viewer = await requireFreelancer();
  const { month: rawMonth } = await searchParams;
  const requested = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  const time = await getMyTime(viewer, requested);
  const viewedMonth = time.month.slice(0, 7);
  const currentMonth = time.currentMonth.slice(0, 7);
  const hasActions = time.days.some((day) => day.entries.some((entry) => entry.canEdit || entry.canCorrectDescription));

  return (
    <div className="space-y-8">
      <PageHeader
        title="My time"
        action={
          time.trackable.length > 0 ? (
            <AddTimeDialog
              tasks={time.trackable}
              today={time.today}
              trigger="primary"
              viewedMonth={viewedMonth}
              currentMonth={currentMonth}
            />
          ) : undefined
        }
      />

      <MonthNav months={time.months} month={time.month} currentMonth={time.currentMonth} />

      {time.closed ? (
        <p className="text-body-sm text-muted-foreground">This month is closed, so its time can&apos;t change.</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="sr-only">Totals</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="This month" value={formatDuration(time.totalMinutes)} />
          {time.overLimitMinutes > 0 ? (
            <StatCard label="Over limit" value={formatDuration(time.overLimitMinutes)} />
          ) : null}
        </div>
      </section>

      {time.trackable.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-heading-xs">Tasks you can track</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {time.trackable.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="eyebrow">{task.projectName}</p>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="rounded-sm text-body-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
                  >
                    {task.title}
                  </Link>
                </div>
                <StartTimerButton variant="icon" task={{ id: task.id, title: task.title, projectName: task.projectName }} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {time.days.length === 0 ? (
        <EmptyState
          title="No time this month"
          description={
            time.trackable.length > 0
              ? "Add time, or start the timer on a task you can track."
              : "When a task is approved, you can track time on it here."
          }
        />
      ) : (
        <div className="space-y-8">
          {time.days.map((day) => (
            <section key={day.date} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-heading-xs">{formatCalendarDate(day.date)}</h2>
                <p className="numeric text-body-sm">{formatDuration(day.totalMinutes)}</p>
              </div>
              {day.overLimitMinutes > 0 ? (
                <p className="text-caption text-error numeric">{formatDuration(day.overLimitMinutes)} over limit</p>
              ) : null}
              <Table>
                <caption className="sr-only">Time on {formatCalendarDate(day.date)}</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Over limit</TableHead>
                    {hasActions ? (
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell data-label="Task" className="font-medium md:max-w-64 md:whitespace-normal">
                        <Link
                          href={`/tasks/${entry.taskId}`}
                          className="rounded-sm text-link underline-offset-4 hover:underline focus-ring"
                        >
                          {entry.taskTitle}
                        </Link>
                        <span className="mt-0.5 block text-caption text-muted-foreground">{entry.projectName}</span>
                      </TableCell>
                      <TableCell data-label="Description" className="md:max-w-80 md:whitespace-normal">
                        <span className="whitespace-pre-line break-words">{entry.description}</span>
                      </TableCell>
                      <TableCell data-label="Source">
                        <EntrySource
                          source={entry.source}
                          startedAt={entry.startedAt}
                          endedAt={entry.endedAt}
                          timeZone={time.timeZone}
                          autoStoppedReason={entry.autoStoppedReason}
                        />
                      </TableCell>
                      <TableCell data-label="Duration" className="numeric md:text-right">
                        {formatDuration(entry.durationMinutes)}
                      </TableCell>
                      <TableCell data-label="Over limit" className="md:text-right">
                        <OverLimit minutes={entry.overLimitMinutes} />
                      </TableCell>
                      {hasActions ? (
                        <TableCell data-label="Actions" className="md:text-right">
                          <TimeEntryActions
                            entry={entry}
                            dateMax={time.today}
                            timeZone={time.timeZone}
                            viewedMonth={viewedMonth}
                            currentMonth={currentMonth}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
