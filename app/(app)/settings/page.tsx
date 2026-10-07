import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Settings · Olifant Workboard" };

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <PlaceholderPage
      eyebrow="Admin"
      title="Settings"
      emptyTitle="Settings come next"
      emptyDescription="Organization name, time zone, and tolerance will show up here."
    />
  );
}
