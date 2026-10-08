import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireViewer } from "@/lib/auth/queries";
import { countApprovalQueue } from "@/lib/proposals/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const approvalsCount = viewer.role === "admin" ? await countApprovalQueue() : undefined;

  return (
    <TooltipProvider>
      <SidebarProvider open>
        <AppSidebar
          viewer={{ fullName: viewer.fullName, email: viewer.email, role: viewer.role }}
          approvalsCount={approvalsCount}
        />
        <SidebarInset>
          <TopBar />
          <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
