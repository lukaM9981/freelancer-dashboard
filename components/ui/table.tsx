"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="w-full md:overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-body-xs", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("max-md:hidden [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("max-md:block [&_tr:last-child]:md:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-border transition-colors duration-150 ease-brand max-md:mb-3 max-md:block max-md:rounded-lg max-md:border max-md:p-3 md:h-12 md:border-b md:hover:bg-muted/50",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle eyebrow [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

type TableCellProps = React.ComponentProps<"td"> & { "data-label"?: string }

function TableCell({ className, children, "data-label": label = "", ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      data-label={label || undefined}
      className={cn(
        "px-3 align-middle max-md:flex max-md:items-baseline max-md:gap-4 max-md:px-0 max-md:py-1 md:whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        label ? "max-md:justify-between" : "max-md:justify-end",
        className
      )}
      {...props}
    >
      {label ? <span className="shrink-0 text-muted-foreground md:hidden">{label}</span> : null}
      {children}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-caption text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
