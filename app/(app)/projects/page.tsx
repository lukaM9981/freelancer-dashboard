import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Projects · Olifant Workboard" };

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      title="Projects"
      emptyTitle="No projects yet"
      emptyDescription="Projects you can see will show up here."
    />
  );
}
