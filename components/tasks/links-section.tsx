"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLinkIcon, XIcon } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { applyFieldErrors } from "@/lib/forms";
import { addTaskLink, removeTaskLink } from "@/lib/tasks/actions";
import type { TaskLink } from "@/lib/tasks/queries";
import { addLinkSchema } from "@/lib/tasks/schemas";

const linkFormSchema = addLinkSchema.pick({ url: true, label: true });
type LinkFormValues = z.infer<typeof linkFormSchema>;

type LinksSectionProps = { taskId: string; links: TaskLink[]; canManage: boolean };

export function LinksSection({ taskId, links, canManage }: LinksSectionProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: { url: "", label: "" },
  });

  async function onSubmit(values: LinkFormValues) {
    const result = await addTaskLink({ taskId, ...values });
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    form.reset({ url: "", label: "" });
    router.refresh();
  }

  async function remove(link: TaskLink) {
    setRemoving(link.id);
    const result = await removeTaskLink({ taskId, linkId: link.id });
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Link removed.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {links.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No links yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 px-4 py-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1.5 rounded-sm text-body-sm font-medium text-link underline-offset-4 hover:underline focus-ring"
              >
                <span className="truncate">{link.label ?? link.url}</span>
                <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {canManage ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove link ${link.label ?? link.url}`}
                        disabled={removing === link.id}
                        onClick={() => remove(link)}
                      >
                        <XIcon />
                      </Button>
                    }
                  />
                  <TooltipContent>Remove link</TooltipContent>
                </Tooltip>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="url"
              id="link-url"
              label="Web address"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
            />
            <TextField
              control={form.control}
              name="label"
              id="link-label"
              label="Label"
              autoComplete="off"
              placeholder="Optional, for example Figma file"
            />
          </div>
          <SubmitButton variant="secondary" pending={form.formState.isSubmitting} className="sm:mt-6">
            Add Link
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
