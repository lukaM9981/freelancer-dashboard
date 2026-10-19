import { cn } from "@/lib/utils";

type DashboardCardProps = {
  id: string;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function DashboardCard({ id, title, description, className, children }: DashboardCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6", className)}
    >
      <div className="min-w-0 space-y-1">
        <h2 id={id} className="text-heading-xs">
          {title}
        </h2>
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
