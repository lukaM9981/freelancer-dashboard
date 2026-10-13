"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { formatDateTime, formatRelative } from "@/lib/format";
import { markNotificationsRead } from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/describe";
import { cn } from "@/lib/utils";

/** Marks notifications read, then refreshes so the bell and the page agree. `ids` omitted: all. */
export function useMarkRead() {
  const router = useRouter();
  return useCallback(
    async (ids?: string[]) => {
      const result = await markNotificationsRead(ids ? { ids } : {});
      if (!result.ok) toast.error(result.error);
      router.refresh();
      return result.ok;
    },
    [router],
  );
}

export function NotificationEntry({
  item,
  read,
  timeZone,
  onOpen,
}: {
  item: NotificationItem;
  read: boolean;
  timeZone: string;
  onOpen: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className="flex gap-3 rounded-sm px-3 py-2.5 transition-colors duration-150 ease-brand hover:bg-accent focus-ring"
    >
      <span
        aria-hidden="true"
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", read ? "bg-transparent" : "bg-primary")}
      />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-body-xs", read ? "font-medium" : "font-bold")}>
          {read ? null : <span className="sr-only">Unread: </span>}
          {item.text}
        </span>
        {item.detail ? (
          <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-caption text-muted-foreground">
            {item.detail}
          </span>
        ) : null}
        <span className="mt-1 block text-caption text-muted-foreground">
          {item.projectName ? `${item.projectName} \u00b7 ` : ""}
          <time dateTime={item.createdAt} title={formatDateTime(item.createdAt, timeZone)}>
            {formatRelative(item.createdAt, timeZone)}
          </time>
        </span>
      </span>
    </Link>
  );
}
