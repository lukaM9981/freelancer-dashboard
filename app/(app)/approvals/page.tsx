import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Approvals · Olifant Workboard" };

export default async function ApprovalsPage() {
  await requireAdmin();

  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Approvals"
      emptyTitle="Nothing waiting for you"
      emptyDescription="New proposals from freelancers will show up here."
    />
  );
}
