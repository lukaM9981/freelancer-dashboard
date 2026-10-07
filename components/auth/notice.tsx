import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeProps = {
  variant: "success" | "error";
  children: React.ReactNode;
  className?: string;
};

// Ink text with a coloured icon: green-700 and red-600 on their subtle fills fail
// contrast for small text (Design.md §3.1).
export function Notice({ variant, children, className }: NoticeProps) {
  const Icon = variant === "success" ? CircleCheckIcon : TriangleAlertIcon;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-sm border p-3 text-body-xs text-foreground",
        variant === "success" ? "border-success-border bg-success-subtle" : "border-error-border bg-error-subtle",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-px size-4 shrink-0", variant === "success" ? "text-success" : "text-error")}
      />
      <div>{children}</div>
    </div>
  );
}
