import type { Metadata } from "next";
import Link from "next/link";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditList } from "@/components/audit/audit-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  type AuditSearchParams,
  auditHref,
  hasFilters,
  PAGE_MAX,
  PAGE_STEP,
  parseAuditFilters,
  rangeIsInverted,
  shownCount,
} from "@/lib/audit/filters";
import { listAuditEntries } from "@/lib/audit/queries";
import { requireAdmin } from "@/lib/auth/queries";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log · Olifant Workboard" };

type AuditPageProps = { searchParams: Promise<AuditSearchParams> };

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const viewer = await requireAdmin();
  const params = await searchParams;
  const filters = parseAuditFilters(params);
  const limit = shownCount(params.show);
  const settings = await getOrganizationSettings();
  const page = await listAuditEntries(viewer, filters, { limit, timeZone: settings.timeZone });
  const filtered = hasFilters(filters);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Audit log" />
      <AuditFilters filters={filters} people={page.people} projects={page.projects} />
      {page.entries.length === 0 ? (
        <EmptyState
          title={filtered ? "No matching events" : "No history yet"}
          description={
            rangeIsInverted(filters)
              ? "Pick a start date on or before the end date."
              : filtered
                ? "Try a wider date range or fewer filters."
                : "Recorded events will show up here."
          }
        />
      ) : (
        <div className="space-y-6">
          <AuditList entries={page.entries} timeZone={settings.timeZone} />
          {page.hasMore && limit < PAGE_MAX ? (
            <div className="flex justify-center">
              <Link
                href={auditHref(filters, limit + PAGE_STEP)}
                scroll={false}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Load More
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
