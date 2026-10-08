"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { TextareaField } from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { applyFieldErrors } from "@/lib/forms";
import { createProject, updateProject } from "@/lib/projects/actions";
import { type ProjectFormInput, projectFormSchema } from "@/lib/projects/schemas";

type ProjectDialogProps =
  | { mode: "create" }
  | { mode: "edit"; projectId: string; name: string; description: string };

export function ProjectDialog(props: ProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const defaults: ProjectFormInput =
    props.mode === "edit" ? { name: props.name, description: props.description } : { name: "", description: "" };
  const form = useForm<ProjectFormInput>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaults,
  });

  function close() {
    setOpen(false);
    form.reset(defaults);
  }

  async function onSubmit(values: ProjectFormInput) {
    const result =
      props.mode === "edit"
        ? await updateProject({ projectId: props.projectId, ...values })
        : await createProject(values);
    if (result && !result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    if (props.mode === "edit") {
      setOpen(false);
      form.reset(values);
      toast.success("Project updated.");
      router.refresh();
    }
  }

  const isEdit = props.mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button type="button" variant="outline">
              Edit
            </Button>
          ) : (
            <Button type="button">New Project</Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Members see the new name and description right away."
              : "The project starts as Active. Add members once it exists."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
          <FieldGroup>
            <TextField control={form.control} name="name" label="Name" autoComplete="off" autoFocus />
            <TextareaField
              control={form.control}
              name="description"
              label="Description"
              description="Optional. What the project is about, in a sentence or two."
            />
          </FieldGroup>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <SubmitButton pending={form.formState.isSubmitting}>
              {isEdit ? "Save Project" : "Create Project"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
