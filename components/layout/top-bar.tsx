"use client";

import { TimerBar } from "@/components/timer/timer-bar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Menu button below `lg`, the timer bar, then the notification bell (Design.md §5.5). */
export function TopBar({ bell }: { bell: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background px-4 md:px-6 lg:px-8">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger className="lg:hidden" aria-label="Open menu" />} />
        <TooltipContent>Open menu</TooltipContent>
      </Tooltip>
      <div className="flex min-w-0 flex-1 justify-center" data-slot="timer-bar">
        <TimerBar />
      </div>
      <div className="flex size-10 shrink-0 items-center justify-center" data-slot="notification-bell">
        {bell}
      </div>
    </header>
  );
}
