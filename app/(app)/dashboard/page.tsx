import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireViewer } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Dashboard · Olifant Workboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();

  return (
    <PlaceholderPage
      eyebrow={viewer.role === "admin" ? "Admin" : "Freelancer"}
      title="Dashboard"
      emptyTitle="Nothing waiting for you"
      emptyDescription="Your overview for this month will show up here."
    />
  );
}
