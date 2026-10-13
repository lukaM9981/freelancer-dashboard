import { cn } from "@/lib/utils";

type DashboardCardProps = {
  id: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** The Brand card: at most one per screen (Design.md §4.3). */
  brand?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function DashboardCard({ id, title, description, action, brand, className, children }: DashboardCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-lg bg-card p-4 md:p-6",
        brand ? "ring-[1.5px] ring-inset ring-primary" : "border border-border",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h2 id={id} className="text-heading-xs">
            {title}
          </h2>
          {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
