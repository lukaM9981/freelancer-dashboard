import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { AddTimeDialog } from "@/components/time/add-time-dialog";
import { MonthNav } from "@/components/time/month-nav";
import { StartTimerButton } from "@/components/timer/start-timer-button";
import { requireFreelancer } from "@/lib/auth/queries";
import { formatDuration } from "@/lib/format";
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
      ) : (
        <EmptyState
          title="No tasks to track"
          description="When a task is approved, you can track time on it here."
        />
      )}
    </div>
  );
}
