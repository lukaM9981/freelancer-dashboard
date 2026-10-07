"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Menu button below `lg`. The middle and the right are empty on purpose:
 * the timer bar (phase 9) and the notification bell (phase 14) land there.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:px-6 lg:px-8">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger className="lg:hidden" aria-label="Open menu" />} />
        <TooltipContent>Open menu</TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1" data-slot="timer-bar" />
      <div className="size-10 shrink-0" data-slot="notification-bell" aria-hidden="true" />
    </header>
  );
}
