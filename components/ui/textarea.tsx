import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full min-w-0 rounded-sm border-[1.5px] border-input bg-white px-4 py-3 text-body-sm text-foreground transition-[border-color,box-shadow] duration-150 ease-brand placeholder:text-neutral-400 focus-field read-only:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
