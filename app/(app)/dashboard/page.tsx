import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth/queries";

export const metadata: Metadata = { title: "Dashboard · Olifant Workboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const role = viewer.role === "admin" ? "Admin" : "Freelancer";

  return (
    <div className="space-y-2">
      <p className="eyebrow">{role}</p>
      <h1 className="text-heading-md lg:text-heading-lg">Welcome, {viewer.fullName}</h1>
      <p className="text-muted-foreground">
        You&apos;re signed in as {viewer.email} with the {role} role.
      </p>
    </div>
  );
}
