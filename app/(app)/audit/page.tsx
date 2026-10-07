import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Audit log · Olifant Workboard" };

export default async function AuditPage() {
  await requireAdmin();

  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Audit log"
      emptyTitle="No history yet"
      emptyDescription="Recorded events will show up here."
    />
  );
}
