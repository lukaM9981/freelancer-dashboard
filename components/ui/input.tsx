import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-sm border-[1.5px] border-input bg-white px-4 text-body-sm text-foreground transition-[border-color,box-shadow] duration-150 ease-brand file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-xs file:font-medium file:text-foreground placeholder:text-neutral-400 focus-field read-only:bg-muted disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
