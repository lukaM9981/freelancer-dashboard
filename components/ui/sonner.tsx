"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-700" />,
        error: <OctagonXIcon className="size-4 text-error" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-(--width) items-start gap-3 rounded-md border border-l-[3px] border-border bg-card p-4 text-foreground shadow-md",
          icon: "mt-px shrink-0",
          content: "flex flex-col gap-0.5",
          title: "text-body-xs font-bold",
          description: "text-body-xs text-muted-foreground",
          success: "border-l-success",
          error: "border-l-error",
          info: "border-l-info",
          warning: "border-l-yellow-500",
          actionButton:
            "ml-auto shrink-0 rounded-full bg-secondary px-3 py-1 text-caption font-bold text-secondary-foreground focus-ring",
          cancelButton:
            "shrink-0 rounded-full px-3 py-1 text-caption font-medium text-foreground hover:bg-accent focus-ring",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
