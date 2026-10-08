import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { formatEntryClock } from "@/lib/time/run";

export function EntrySource({
  source,
  startedAt,
  endedAt,
  timeZone,
  autoStoppedReason,
}: {
  source: "timer" | "manual";
  startedAt: string | null;
  endedAt: string | null;
  timeZone: string;
  autoStoppedReason: string | null;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={source === "timer" ? "info" : "outline"} size="sm">
        {source === "timer" ? "Timed" : "Manual"}
      </Badge>
      {source === "timer" && startedAt && endedAt ? (
        <span className="font-mono text-caption text-muted-foreground numeric">
          {formatEntryClock(startedAt, endedAt, timeZone)}
        </span>
      ) : null}
      {autoStoppedReason ? <span className="text-caption text-muted-foreground">Stopped automatically</span> : null}
    </div>
  );
}

export function OverLimit({ minutes }: { minutes: number }) {
  if (minutes <= 0) return <span className="text-muted-foreground">{"\u2014"}</span>;
  return (
    <Badge variant="error" size="sm" className="numeric">
      {formatDuration(minutes)}
    </Badge>
  );
}
