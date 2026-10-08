"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PersonStatusBadge } from "@/components/people/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addProjectMember, removeProjectMember } from "@/lib/projects/actions";
import type { MemberCandidate, ProjectMember } from "@/lib/projects/queries";

type MembersSectionProps = {
  projectId: string;
  members: ProjectMember[];
  candidates: MemberCandidate[];
  readOnly: boolean;
};

export function MembersSection({ projectId, members, candidates, readOnly }: MembersSectionProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const [pending, setPending] = useState(false);
  const items = Object.fromEntries(candidates.map((person) => [person.userId, person.fullName]));

  async function add() {
    if (!selected) {
      toast.error("Choose a person to add.");
      return;
    }
    setAdding(true);
    const result = await addProjectMember({ projectId, userId: selected });
    setAdding(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSelected(null);
    toast.success("Member added.");
    router.refresh();
  }

  async function remove(member: ProjectMember) {
    setPending(true);
    const result = await removeProjectMember({ projectId, userId: member.userId });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRemoving(null);
    toast.success("Member removed.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {readOnly ? null : candidates.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Every active freelancer is already a member. Invite someone on the People page to add more.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="sm:max-w-xs">
            <FieldLabel htmlFor="add-member">Add a freelancer</FieldLabel>
            <Select
              items={items}
              value={selected}
              onValueChange={(value) => setSelected(typeof value === "string" ? value : null)}
            >
              <SelectTrigger id="add-member">
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((person) => (
                  <SelectItem key={person.userId} value={person.userId}>
                    {person.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="button" disabled={adding || !selected} onClick={add}>
            Add Member
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No members yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/people/${member.userId}`}
                  className="rounded-sm text-body-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
                >
                  {member.fullName}
                </Link>
                <p className="truncate text-caption text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {member.status === "deactivated" ? <PersonStatusBadge status="deactivated" /> : null}
                {member.openTaskCount > 0 ? (
                  <span className="text-caption text-muted-foreground">
                    <span className="numeric">{member.openTaskCount}</span>{" "}
                    {member.openTaskCount === 1 ? "open task" : "open tasks"}
                  </span>
                ) : null}
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={member.openTaskCount > 0}
                    title={
                      member.openTaskCount > 0
                        ? "Reassign or cancel their open tasks in this project first."
                        : undefined
                    }
                    aria-label={`Remove ${member.fullName}`}
                    onClick={() => setRemoving(member)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={removing != null} onOpenChange={(open) => (open ? null : setRemoving(null))}>
        <DialogContent>
          {removing ? (
            <>
              <DialogHeader>
                <DialogTitle>Remove {removing.fullName}?</DialogTitle>
                <DialogDescription>
                  They can no longer create tasks in this project. Their past tasks and history stay.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
                <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="destructive" disabled={pending} onClick={() => remove(removing)}>
                  Remove
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
