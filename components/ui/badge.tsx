import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        brand: "bg-yellow-100 text-yellow-800",
        accent: "bg-pine-100 text-pine-700",
        info: "bg-info-subtle text-info",
        success:
          "bg-success-subtle text-foreground ring-1 ring-inset ring-success-border [&_svg]:text-success",
        error:
          "bg-error-subtle text-foreground ring-1 ring-inset ring-error-border [&_svg]:text-error",
        outline: "bg-white text-foreground ring-1 ring-inset ring-border",
      },
      size: {
        default: "px-3 py-1 text-caption [&_svg]:size-3.5",
        sm: "px-2 py-0.5 text-xs [&_svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
