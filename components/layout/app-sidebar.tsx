"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ChartColumn,
  Clock,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  freelancerOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/approvals", label: "Approvals", icon: Inbox, adminOnly: true },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/time", label: "My time", icon: Clock, freelancerOnly: true },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/months", label: "Months", icon: CalendarRange, adminOnly: true },
  { href: "/people", label: "People", icon: Users, adminOnly: true },
  { href: "/audit", label: "Audit log", icon: ScrollText, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

type AppSidebarProps = {
  viewer: { fullName: string; email: string; role: "admin" | "freelancer" };
  /** Shown on Approvals once that inbox exists. Omitted until then. */
  approvalsCount?: number;
};

export function AppSidebar({ viewer, approvalsCount }: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const items = NAV.filter((item) => {
    if (item.adminOnly && viewer.role !== "admin") return false;
    if (item.freelancerOnly && viewer.role !== "freelancer") return false;
    return true;
  });

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard" className="inline-flex w-fit rounded-sm focus-ring">
          <Image
            src="/brand/logo-full.png"
            alt="Olifant Workboard"
            width={588}
            height={238}
            preload
            className="h-8 w-auto"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                const count = item.href === "/approvals" ? approvalsCount : undefined;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      className={count ? "pr-10" : undefined}
                      aria-current={active ? "page" : undefined}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {count != null && count > 0 ? (
                      <SidebarMenuBadge className="numeric">{count}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <ProfileMenu name={viewer.fullName} email={viewer.email} />
      </SidebarFooter>
    </Sidebar>
  );
}

function ProfileMenu({ name, email }: { name: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-150 ease-brand hover:bg-sidebar-accent focus-ring">
        <Avatar size="sm">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-xs font-medium">{name}</span>
          <span className="block truncate text-caption text-muted-foreground">{email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
            Sign Out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
