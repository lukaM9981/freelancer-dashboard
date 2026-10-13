"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellIcon } from "lucide-react";
import { NotificationEntry, useMarkRead } from "@/components/notifications/notification-entry";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NotificationItem } from "@/lib/notifications/describe";
import { createClient } from "@/utils/supabase/client";

type NotificationBellProps = {
  userId: string;
  unreadCount: number;
  items: NotificationItem[];
  timeZone: string;
};

/**
 * The unread count and the newest notifications (PRD §6.12). The layout renders the
 * server's numbers; Realtime refreshes them when a notification arrives (Tech.md §8).
 */
export function NotificationBell({ userId, unreadCount, items, timeZone }: NotificationBellProps) {
  const router = useRouter();
  const markRead = useMarkRead();
  const [open, setOpen] = useState(false);
  // Marked read here, shown at once while the refresh is on its way.
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [allReadAt, setAllReadAt] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let subscribedOnce = false;
    const channel = supabase
      .channel(`bell:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // Notifications that arrived while the connection was down are not replayed.
        if (subscribedOnce) router.refresh();
        subscribedOnce = true;
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const isRead = (item: NotificationItem) =>
    item.read || item.ids.every((id) => readIds.has(id)) || (allReadAt != null && item.createdAt <= allReadAt);
  const locallyRead = items.filter((item) => !item.read && isRead(item)).reduce((sum, item) => sum + item.ids.length, 0);
  const count = allReadAt != null ? items.filter((item) => !isRead(item)).length : Math.max(0, unreadCount - locallyRead);
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  function openItem(item: NotificationItem) {
    setOpen(false);
    if (isRead(item)) return;
    setReadIds((current) => new Set([...current, ...item.ids]));
    void markRead(item.ids);
  }

  function markAll() {
    setAllReadAt(new Date().toISOString());
    void markRead();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={label} className="relative">
                  <BellIcon />
                  {count > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-100 px-1.5 text-caption font-medium text-yellow-800 numeric"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </Button>
              }
            />
          }
        />
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <PopoverTitle className="text-body-sm">Notifications</PopoverTitle>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={count === 0}>
            Mark All Read
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-body-xs text-muted-foreground">
            Nothing yet. Updates about your work will show up here.
          </p>
        ) : (
          <ol className="max-h-[min(28rem,calc(var(--available-height)-7rem))] overflow-y-auto p-1">
            {items.map((item) => (
              <li key={item.key}>
                <NotificationEntry item={item} read={isRead(item)} timeZone={timeZone} onOpen={() => openItem(item)} />
              </li>
            ))}
          </ol>
        )}
        <div className="border-t border-border p-1">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-3 py-2 text-center text-body-xs font-medium text-link underline-offset-4 hover:underline focus-ring"
          >
            View All
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
