import { Archive, CirclePause, CirclePlay } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/lib/projects/schemas";

export function projectStatusLabel(status: string) {
  if (status === "on_hold") return "On hold";
  if (status === "archived") return "Archived";
  return "Active";
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  if (status === "on_hold") {
    return (
      <Badge variant="default">
        <CirclePause />
        On hold
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge variant="outline">
        <Archive />
        Archived
      </Badge>
    );
  }
  return (
    <Badge variant="accent">
      <CirclePlay />
      Active
    </Badge>
  );
}
