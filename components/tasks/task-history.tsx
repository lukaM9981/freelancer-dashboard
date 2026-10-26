"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

const PREVIEW = 15;

export function TaskHistory({
  entries,
  timeZone,
}: {
  entries: { id: number; text: string; detail?: string; occurredAt: string }[];
  timeZone: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (entries.length === 0) {
    return <p className="text-body-sm text-muted-foreground">Nothing recorded yet.</p>;
  }

  const ordered = [...entries].sort((a, b) => {
    const byTime = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    return byTime === 0 ? b.id - a.id : byTime;
  });
  const visible = expanded ? ordered : ordered.slice(0, PREVIEW);
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {visible.map((entry) => (
          <li key={entry.id} className="space-y-0.5 border-b border-border pb-3 last:border-0">
            <p className="text-body-xs">{entry.text}</p>
            {entry.detail ? (
              <p className="whitespace-pre-line break-words text-caption text-muted-foreground">{entry.detail}</p>
            ) : null}
            <p className="font-mono text-caption text-muted-foreground">{formatDateTime(entry.occurredAt, timeZone)}</p>
          </li>
        ))}
      </ol>
      {expanded || entries.length <= PREVIEW ? null : (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => setExpanded(true)}>
            See More
          </Button>
        </div>
      )}
    </div>
  );
}
