import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Reports · Olifant Workboard" };

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      emptyTitle="No report yet"
      emptyDescription="Monthly reports will show up here."
    />
  );
}
