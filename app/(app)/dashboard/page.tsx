import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { FreelancerDashboard } from "@/components/dashboard/freelancer-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { requireViewer } from "@/lib/auth/queries";
import { getAdminDashboard, getFreelancerDashboard } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Dashboard · Olifant Workboard" };

export default async function DashboardPage() {
  const viewer = await requireViewer();

  if (viewer.role === "admin") {
    const data = await getAdminDashboard(viewer);
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Admin" title="Dashboard" />
        <AdminDashboard data={data} serverNow={new Date().toISOString()} />
      </div>
    );
  }

  const data = await getFreelancerDashboard(viewer);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Freelancer" title="Dashboard" />
      <FreelancerDashboard data={data} />
    </div>
  );
}
