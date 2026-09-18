"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  ClipboardListIcon,
  FolderKanbanIcon,
  HammerIcon,
  LogOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Requests", href: "/app/requests", icon: ClipboardListIcon },
  { title: "Companies", href: "/app/companies", icon: Building2Icon },
  { title: "Opportunities", href: "/app/opportunities", icon: BriefcaseBusinessIcon },
  { title: "Projects", href: "/app/projects", icon: FolderKanbanIcon },
  { title: "Jobs", href: "/app/jobs", icon: HammerIcon },
];

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Link href="/app/requests" className="px-1 text-sm font-semibold tracking-tight">
          Strong Foam
        </Link>
        <p className="px-1 text-xs text-muted-foreground">Operations</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="gap-2 p-3">
        <p className="truncate px-1 text-xs text-muted-foreground">{email}</p>
        <form action="/api/ops/logout" method="post">
          <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
            <LogOutIcon />
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
