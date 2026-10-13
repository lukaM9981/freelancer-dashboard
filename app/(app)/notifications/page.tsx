import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MarkAllReadButton, NotificationList } from "@/components/notifications/notification-list";
import { buttonVariants } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/queries";
import { listNotifications, PAGE_MAX, PAGE_STEP } from "@/lib/notifications/queries";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications · Olifant Workboard" };

type NotificationsPageProps = {
  searchParams: Promise<{ tab?: string | string[]; show?: string | string[] }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const unreadOnly = params.tab === "unread";
  const limit = shownCount(params.show);
  const [page, settings] = await Promise.all([
    listNotifications(viewer, { unreadOnly, limit }),
    getOrganizationSettings(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Notifications" action={page.unreadCount > 0 ? <MarkAllReadButton /> : undefined} />
      <nav aria-label="Notification lists" className="flex items-center gap-1 border-b border-border">
        <ViewTab href="/notifications" active={!unreadOnly}>
          All
        </ViewTab>
        <ViewTab href="/notifications?tab=unread" active={unreadOnly}>
          Unread{page.unreadCount > 0 ? <span className="numeric"> ({page.unreadCount})</span> : null}
        </ViewTab>
      </nav>
      {page.items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "You're all caught up" : "No notifications"}
          description={
            unreadOnly ? "New updates will show up here." : "Updates about your tasks, approvals, and months will show up here."
          }
        />
      ) : (
        <div className="space-y-6">
          <NotificationList items={page.items} timeZone={settings.timeZone} />
          {page.hasMore && limit < PAGE_MAX ? (
            <div className="flex justify-center">
              <Link
                href={pageHref(unreadOnly, limit + PAGE_STEP)}
                scroll={false}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Load More
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function shownCount(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(value) || value <= PAGE_STEP) return PAGE_STEP;
  return Math.min(PAGE_MAX, Math.ceil(value / PAGE_STEP) * PAGE_STEP);
}

function pageHref(unreadOnly: boolean, show: number): string {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("tab", "unread");
  params.set("show", String(show));
  return `/notifications?${params.toString()}`;
}

function ViewTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px rounded-t-sm border-b-2 border-transparent px-4 py-2.5 text-body-xs font-medium text-muted-foreground transition-colors duration-150 ease-brand focus-ring hover:text-foreground",
        active && "border-primary font-bold text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
