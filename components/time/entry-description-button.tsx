"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { TextareaField } from "@/components/textarea-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyFieldErrors } from "@/lib/forms";
import { correctEntryDescription } from "@/lib/time/actions";
import { entryDescriptionSchema } from "@/lib/time/schemas";

const formSchema = entryDescriptionSchema.pick({ description: true });
type FormValues = { description: string };

/** Corrects only an entry's description, for example after the timer stopped automatically. */
export function EntryDescriptionButton({
  entryId,
  description,
  dateLabel,
}: {
  entryId: string;
  description: string;
  dateLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Correct the description of the entry on ${dateLabel}`}
              onClick={() => setOpen(true)}
            >
              <PencilIcon />
            </Button>
          }
        />
        <TooltipContent>Correct description</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open ? (
            <DescriptionForm
              entryId={entryId}
              description={description}
              dateLabel={dateLabel}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DescriptionForm({
  entryId,
  description,
  dateLabel,
  onDone,
}: {
  entryId: string;
  description: string;
  dateLabel: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { description } });

  async function onSubmit(values: FormValues) {
    const result = await correctEntryDescription({ entryId, description: values.description });
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Description saved.");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>Correct the description</DialogTitle>
        <DialogDescription>
          The entry on {dateLabel}. Only the description changes; the time stays as recorded.
        </DialogDescription>
      </DialogHeader>
      <TextareaField
        control={form.control}
        name="description"
        id={`entry-description-${entryId}`}
        label="What did you work on?"
        autoFocus
      />
      <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <SubmitButton variant="secondary" pending={form.formState.isSubmitting}>
          Save Description
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
