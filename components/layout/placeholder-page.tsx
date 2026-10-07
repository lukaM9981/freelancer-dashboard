import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";

type PlaceholderPageProps = {
  eyebrow?: string;
  title: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  emptyTitle,
  emptyDescription,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyState title={emptyTitle} description={emptyDescription} />
    </div>
  );
}
