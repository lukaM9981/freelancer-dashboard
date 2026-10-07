import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Months · Olifant Workboard" };

export default async function MonthsPage() {
  await requireAdmin();

  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Months"
      emptyTitle="No months yet"
      emptyDescription="Closed months will show up here."
    />
  );
}
