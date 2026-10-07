"use client";

import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & { pending: boolean };

// Keeps its width while pending: the label stays in place, invisible, under the spinner.
export function SubmitButton({ pending, children, className, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("relative", className)}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>{children}</span>
      {pending && <Loader2Icon aria-hidden className="absolute animate-spin" />}
    </Button>
  );
}
