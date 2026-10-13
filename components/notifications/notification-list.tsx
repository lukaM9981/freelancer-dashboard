"use client";

import { useState } from "react";
import { NotificationEntry, useMarkRead } from "@/components/notifications/notification-entry";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/notifications/describe";

export function NotificationList({ items, timeZone }: { items: NotificationItem[]; timeZone: string }) {
  const markRead = useMarkRead();
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => new Set());

  return (
    <ol className="divide-y divide-border rounded-lg border border-border bg-card p-1">
      {items.map((item) => {
        const read = item.read || item.ids.every((id) => readIds.has(id));
        return (
          <li key={item.key} className="py-0.5">
            <NotificationEntry
              item={item}
              read={read}
              timeZone={timeZone}
              onOpen={() => {
                if (read) return;
                setReadIds((current) => new Set([...current, ...item.ids]));
                void markRead(item.ids);
              }}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function MarkAllReadButton() {
  const markRead = useMarkRead();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await markRead();
        setPending(false);
      }}
    >
      Mark All Read
    </Button>
  );
}
