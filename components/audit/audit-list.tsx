import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import type { AuditEntry } from "@/lib/audit/describe";
import { formatDateTime } from "@/lib/format";

const LINK_CLASS = "rounded-sm text-link underline-offset-4 hover:underline focus-ring";

export function AuditList({ entries, timeZone }: { entries: AuditEntry[]; timeZone: string }) {
  return (
    <ol className="divide-y divide-border rounded-lg border border-border bg-card">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:gap-6">
          <time
            dateTime={entry.occurredAt}
            className="shrink-0 font-mono text-caption text-muted-foreground sm:w-36 sm:pt-0.5"
          >
            {formatDateTime(entry.occurredAt, timeZone)}
          </time>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-body-xs">{entry.text}</p>
            {entry.detail ? (
              <p className="whitespace-pre-line break-words text-caption text-muted-foreground">{entry.detail}</p>
            ) : null}
            {entry.links.length > 0 ? (
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption">
                {entry.links.map((link) => (
                  <Link key={link.href} href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                ))}
              </p>
            ) : null}
            {entry.changes.length > 0 ? <Changes changes={entry.changes} /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Changes({ changes }: { changes: AuditEntry["changes"] }) {
  return (
    <details className="group text-caption">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm font-medium text-link focus-ring [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon aria-hidden className="size-3.5 transition-transform duration-150 ease-brand group-open:rotate-90" />
        {changes.length === 1 ? "Show the change" : `Show ${changes.length} changes`}
      </summary>
      <dl className="mt-2 space-y-2 rounded-md bg-muted p-3">
        {changes.map((change) => (
          <div key={change.label} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
            <dt className="font-medium text-muted-foreground">{change.label}</dt>
            <dd className="min-w-0 space-y-0.5 break-words">
              <p className="whitespace-pre-line">
                <span className="text-muted-foreground">Before: </span>
                {change.from}
              </p>
              <p className="whitespace-pre-line">
                <span className="text-muted-foreground">After: </span>
                {change.to}
              </p>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
