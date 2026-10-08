import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ProjectStatusBadge } from "@/components/projects/labels";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/queries";
import { formatDuration, formatMoney } from "@/lib/format";
import type { MonthFigures } from "@/lib/projects/figures";
import { listProjects, type ProjectView } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects · Olifant Workboard" };

type ProjectsPageProps = { searchParams: Promise<{ view?: string | string[] }> };

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const viewer = await requireViewer();
  const { view: rawView } = await searchParams;
  const view: ProjectView = rawView === "archived" ? "archived" : "current";
  const { rows } = await listProjects(viewer, view);
  const isAdmin = viewer.role === "admin";

  return (
    <div className="space-y-8">
      <PageHeader title="Projects" action={isAdmin ? <ProjectDialog mode="create" /> : undefined} />
      <nav aria-label="Project lists" className="flex items-center gap-1 border-b border-border">
        <ViewTab href="/projects" active={view === "current"}>
          Current
        </ViewTab>
        <ViewTab href="/projects?view=archived" active={view === "archived"}>
          Archived
        </ViewTab>
      </nav>
      {rows.length === 0 ? (
        <EmptyState {...emptyCopy(view, isAdmin)} />
      ) : (
        <Table>
          <caption className="sr-only">
            {view === "archived" ? "Archived projects" : "Active and on-hold projects"}
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{isAdmin ? "Tasks" : "Your tasks"}</TableHead>
              <TableHead className="text-right">Time this month</TableHead>
              <TableHead className="text-right">Cost this month</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="relative cursor-pointer">
                <TableCell data-label="Project" className="md:max-w-80 md:whitespace-normal">
                  <Link
                    href={`/projects/${row.id}`}
                    className="rounded-sm font-medium text-link underline-offset-4 after:absolute after:inset-0 hover:underline focus-ring"
                  >
                    {row.name}
                  </Link>
                  {row.description ? (
                    <p className="line-clamp-1 text-caption text-muted-foreground">{row.description}</p>
                  ) : null}
                </TableCell>
                <TableCell data-label="Status">
                  <ProjectStatusBadge status={row.status} />
                </TableCell>
                <TableCell data-label={isAdmin ? "Tasks" : "Your tasks"} className="md:whitespace-normal">
                  {row.taskCounts.length === 0 ? (
                    <span className="text-muted-foreground">No tasks</span>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {row.taskCounts.map((entry) => (
                        <li key={entry.status} className="inline-flex items-center gap-1">
                          <StatusBadge status={entry.status} />
                          <span className="numeric text-body-xs font-medium">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell data-label="Time this month" className="numeric md:text-right">
                  {formatDuration(row.month.trackedMinutes)}
                </TableCell>
                <TableCell data-label="Cost this month" className="numeric md:text-right">
                  <CostCell figures={row.month} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ViewTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px rounded-t-sm border-b-2 border-transparent px-4 py-2.5 text-body-xs font-medium text-muted-foreground transition-colors duration-150 ease-brand focus-ring hover:text-foreground",
        active && "border-primary font-bold text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function CostCell({ figures }: { figures: MonthFigures }) {
  if (figures.amounts.length === 0 && !figures.missingRate) return <span>—</span>;
  return (
    <div className="flex flex-col md:items-end">
      {figures.amounts.map((amount) => (
        <span key={amount.currency}>{formatMoney(amount.cents, amount.currency)}</span>
      ))}
      {figures.missingRate ? <span className="text-caption text-muted-foreground">Some time has no rate</span> : null}
    </div>
  );
}

function emptyCopy(view: ProjectView, isAdmin: boolean) {
  if (view === "archived") {
    return {
      title: "No archived projects",
      description: isAdmin
        ? "Projects you archive move here and stay read-only."
        : "Archived projects you worked on show up here.",
    };
  }
  return isAdmin
    ? { title: "No projects yet", description: "Create the first project, then add the freelancers who work on it." }
    : { title: "No projects yet", description: "Projects you're a member of will show up here." };
}
