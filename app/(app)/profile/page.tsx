import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Profile · Olifant Workboard" };

export default function ProfilePage() {
  return (
    <PlaceholderPage
      title="Profile"
      emptyTitle="Your profile comes next"
      emptyDescription="Your name and password will show up here."
    />
  );
}
