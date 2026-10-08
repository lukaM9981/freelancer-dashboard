import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { NewProposalForm } from "@/components/proposals/new-proposal-form";
import { buttonVariants } from "@/components/ui/button";
import { requireFreelancer } from "@/lib/auth/queries";
import { getNewProposalContext } from "@/lib/proposals/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "New proposal · Olifant Workboard" };

type NewProposalPageProps = {
  searchParams: Promise<{ project?: string | string[]; task?: string | string[] }>;
};

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const viewer = await requireFreelancer();
  const { project: projectParam, task: taskParam } = await searchParams;
  const projectId = Array.isArray(projectParam) ? projectParam[0] : projectParam;
  if (!projectId) notFound();

  const context = await getNewProposalContext(projectId, viewer);
  if (!context) notFound();
  const projectHref = `/projects/${context.project.id}`;
  const preselected = taskParam == null ? [] : Array.isArray(taskParam) ? taskParam : [taskParam];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href={projectHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader eyebrow={context.project.name} title="New proposal" />
      </div>
      {context.tasks.length === 0 ? (
        <EmptyState
          title="Nothing to submit"
          description="Tasks assigned to you that are Draft or Changes requested show up here, ready to submit."
          action={
            <Link href={projectHref} className={buttonVariants({ variant: "outline" })}>
              Back to Project
            </Link>
          }
        />
      ) : (
        <>
          <p className="max-w-xl text-body-sm text-muted-foreground">
            Select the tasks to submit together. Each one is sent with its estimate exactly as it is now, and
            becomes Pending approval until Olifant decides.
          </p>
          <NewProposalForm
            projectId={context.project.id}
            tasks={context.tasks}
            rate={context.rate}
            preselected={preselected}
          />
        </>
      )}
    </div>
  );
}
