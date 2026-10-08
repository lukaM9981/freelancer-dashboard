import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { TimerBarSpacer } from "@/components/timer/timer-bar";
import { TimerProvider } from "@/components/timer/timer-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireViewer } from "@/lib/auth/queries";
import { countApprovalQueue } from "@/lib/proposals/queries";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { getRunningTimer } from "@/lib/time/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const [approvalsCount, timer, settings] = await Promise.all([
    viewer.role === "admin" ? countApprovalQueue() : undefined,
    getRunningTimer(viewer),
    getOrganizationSettings(),
  ]);

  return (
    <TooltipProvider>
      <TimerProvider
        userId={viewer.role === "freelancer" ? viewer.id : null}
        timer={timer}
        serverNow={new Date().toISOString()}
        timeZone={settings.timeZone}
      >
        <SidebarProvider open>
          <AppSidebar
            viewer={{ fullName: viewer.fullName, email: viewer.email, role: viewer.role }}
            approvalsCount={approvalsCount}
          />
          <SidebarInset>
            <TopBar />
            <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
              {children}
              <TimerBarSpacer />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TimerProvider>
    </TooltipProvider>
  );
}
