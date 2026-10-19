import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  /** One figure, or several when money is shown per currency. */
  value?: string;
  values?: string[];
  trend?: { direction: "up" | "down"; label: string };
  variant?: "default" | "brand";
  className?: string;
};

export function StatCard({
  label,
  value,
  values,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const figures = values ?? (value != null ? [value] : []);
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      className={cn(
        "@container flex min-w-0 flex-col gap-2 rounded-lg bg-card p-4 sm:p-6",
        variant === "brand" ? "ring-[1.5px] ring-inset ring-primary" : "border border-border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {figures.map((figure, index) => (
          <p
            key={`${figure}-${index}`}
            className="max-w-full font-black numeric tracking-tight text-[clamp(1.625rem,28cqw,3rem)] leading-none"
          >
            {figure}
          </p>
        ))}
      </div>
      <p className="text-body-sm text-muted-foreground">{label}</p>
      {trend ? (
        <p className="flex items-center gap-1 text-caption text-muted-foreground">
          <TrendIcon className="size-3.5" aria-hidden="true" />
          {trend.label}
        </p>
      ) : null}
    </div>
  );
}
