"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setProjectStatus } from "@/lib/projects/actions";
import type { ProjectStatus } from "@/lib/projects/schemas";

type Confirmable = "on_hold" | "archived";

const confirmations: Record<Confirmable, { title: string; description: string; action: string }> = {
  on_hold: {
    title: "Put this project on hold?",
    description:
      "Planning continues, but nobody can track time on its tasks, and running timers on it are stopped and saved.",
    action: "Put On Hold",
  },
  archived: {
    title: "Archive this project?",
    description:
      "It becomes read-only and is hidden from the default project list. Every task must be final or a draft that was never submitted.",
    action: "Archive",
  },
};

const successMessages: Record<ProjectStatus, string> = {
  active: "Project is active.",
  on_hold: "Project is on hold.",
  archived: "Project archived.",
};

export function ProjectStatusActions({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<Confirmable | null>(null);
  const [pending, setPending] = useState(false);

  async function change(next: ProjectStatus) {
    setPending(true);
    const result = await setProjectStatus({ projectId, status: next });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setConfirming(null);
    toast.success(successMessages[next]);
    router.refresh();
  }

  const dialog = confirming ? confirmations[confirming] : null;

  return (
    <>
      {status === "archived" ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => change("active")}>
          Restore
        </Button>
      ) : null}
      {status === "on_hold" ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => change("active")}>
          Resume
        </Button>
      ) : null}
      {status === "active" ? (
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming("on_hold")}>
          Put On Hold
        </Button>
      ) : null}
      {status !== "archived" ? (
        <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming("archived")}>
          Archive
        </Button>
      ) : null}
      <Dialog open={dialog != null} onOpenChange={(open) => (open ? null : setConfirming(null))}>
        <DialogContent>
          {dialog && confirming ? (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogDescription>{dialog.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
                <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="secondary" disabled={pending} onClick={() => change(confirming)}>
                  {dialog.action}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
