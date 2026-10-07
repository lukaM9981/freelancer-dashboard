import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonStatusBadge, projectStatusLabel, roleLabel } from "@/components/people/labels";
import { AccessActions, RoleForm } from "@/components/people/person-controls";
import { RateSection } from "@/components/people/rate-section";
import { requireAdmin } from "@/lib/auth/queries";
import { getPerson } from "@/lib/people/queries";

type PersonPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const { id } = await params;
  const person = await getPerson(id);
  const name = person?.fullName ?? "Person";
  return { title: `${name} · People · Olifant Workboard` };
}

export default async function PersonPage({ params }: PersonPageProps) {
  await requireAdmin();
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  const isLastAdmin = person.role === "admin" && person.status === "active" && person.activeAdminCount <= 1;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/people" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}>
          <ArrowLeftIcon />
          Back
        </Link>
        <PageHeader
          eyebrow="People"
          title={person.fullName}
          action={
            <AccessActions
              userId={person.id}
              fullName={person.fullName}
              status={person.status}
              isLastAdmin={isLastAdmin}
            />
          }
        />
      </div>
      <p className="flex flex-wrap items-center gap-3 text-body-sm text-muted-foreground">
        <PersonStatusBadge status={person.status} />
        <span>{person.email}</span>
        <span>{roleLabel(person.role)}</span>
      </p>

      <section className="max-w-md space-y-4">
        <h2 className="text-heading-xs">Role</h2>
        <RoleForm userId={person.id} role={person.role} isLastAdmin={isLastAdmin} />
      </section>

      <section className="space-y-4">
        <h2 className="text-heading-xs">Projects</h2>
        {person.memberships.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {person.memberships.map((membership) => (
              <li key={membership.projectId} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span className="text-body-sm font-medium">{membership.projectName}</span>
                <span className="text-caption text-muted-foreground">
                  {projectStatusLabel(membership.projectStatus)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {person.role === "freelancer" ? (
        <section className="max-w-xl space-y-4">
          <h2 className="text-heading-xs">Rate history</h2>
          <RateSection
            userId={person.id}
            rates={person.rates}
            today={person.today}
            defaultCurrency={person.defaultCurrency}
            earliestRateDate={person.earliestRateDate}
          />
        </section>
      ) : null}
    </div>
  );
}
