"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { site } from "@/content/site";
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  ClipboardListIcon,
  FolderKanbanIcon,
  HammerIcon,
  HardHatIcon,
  HouseIcon,
  LogOutIcon,
  UsersRoundIcon,
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
  { title: "Home", href: "/app", icon: HouseIcon, exact: true },
  { title: "Requests", href: "/app/requests", icon: ClipboardListIcon },
  { title: "Companies", href: "/app/companies", icon: Building2Icon },
  { title: "Opportunities", href: "/app/opportunities", icon: BriefcaseBusinessIcon },
  { title: "Projects", href: "/app/projects", icon: FolderKanbanIcon },
  { title: "Jobs", href: "/app/jobs", icon: HammerIcon },
  { title: "Users", href: "/app/users", icon: UsersRoundIcon },
  { title: "Field", href: "/field", icon: HardHatIcon },
];

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Link
          href="/app"
          className="flex items-center px-1"
          aria-label={`${site.brand} home`}
        >
          <BrandLogo variant="onLight" priority />
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
                    isActive={
                      item.exact ? pathname === item.href : pathname.startsWith(item.href)
                    }
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                    className="min-h-11 md:min-h-8"
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
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="min-h-11 w-full justify-start md:min-h-8"
          >
            <LogOutIcon />
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
