import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent whitespace-nowrap select-none focus-ring transition-[color,background-color,border-color,transform] duration-150 ease-brand active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary font-heading font-bold text-primary-foreground hover:bg-secondary hover:text-secondary-foreground disabled:bg-yellow-100 disabled:text-neutral-400",
        secondary:
          "bg-secondary font-heading font-bold text-secondary-foreground! hover:bg-neutral-700 disabled:bg-neutral-300 disabled:text-neutral-100!",
        outline:
          "border-[1.5px] border-foreground bg-transparent font-sans font-bold tracking-wide text-foreground uppercase hover:bg-muted aria-expanded:bg-muted disabled:opacity-50",
        ghost:
          "bg-transparent font-sans font-medium text-foreground hover:bg-accent aria-expanded:bg-accent disabled:opacity-50",
        destructive:
          "bg-destructive font-heading font-bold text-destructive-foreground! hover:bg-destructive/90 disabled:opacity-50",
        link: "font-medium text-link underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        sm: "h-8 gap-1.5 px-4 text-body-xs",
        default: "h-10 gap-2 px-5 text-body-sm",
        lg: "h-12 gap-2.5 px-7 text-body-md",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-5",
        "icon-sm": "size-8",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      { variant: "outline", size: "sm", class: "text-caption" },
      { variant: "outline", size: "default", class: "text-body-xs" },
      { variant: "outline", size: "lg", class: "text-body-sm" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
