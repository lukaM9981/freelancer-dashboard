import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Notifications · Olifant Workboard" };

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications"
      emptyTitle="No notifications"
      emptyDescription="Updates will show up here."
    />
  );
}