import { Ban, CircleCheck, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PersonStatus = "invited" | "active" | "deactivated";

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  if (status === "invited") {
    return (
      <Badge variant="brand">
        <Mail />
        Invited
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge variant="accent">
        <CircleCheck />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      <Ban />
      Deactivated
    </Badge>
  );
}

export function roleLabel(role: "admin" | "freelancer") {
  return role === "admin" ? "Admin" : "Freelancer";
}

export function projectStatusLabel(status: string) {
  if (status === "on_hold") return "On hold";
  if (status === "archived") return "Archived";
  return "Active";
}
