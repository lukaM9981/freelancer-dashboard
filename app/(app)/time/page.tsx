import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireFreelancer } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "My time · Olifant Workboard" };

export default async function MyTimePage() {
  await requireFreelancer();

  return (
    <PlaceholderPage
      title="My time"
      emptyTitle="No time yet"
      emptyDescription="Time you track will show up here."
    />
  );
}
