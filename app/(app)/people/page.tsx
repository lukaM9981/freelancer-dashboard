import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "People · Olifant Workboard" };

export default async function PeoplePage() {
  await requireAdmin();

  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="People"
      emptyTitle="No people yet"
      emptyDescription="People you invite will show up here."
    />
  );
}
