"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";
import { CommandPalette } from "./command-palette";
import { NoticeToaster } from "./notice-toaster";

export function AppShell({
  email,
  demo,
  canManageUsers,
  canPrepareImports,
  showWorkforce,
  children,
}: {
  email: string;
  demo: boolean;
  canManageUsers: boolean;
  canPrepareImports: boolean;
  showWorkforce: boolean;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <a
          href="#ops-main-content"
          className="fixed left-3 top-3 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <AppSidebar
          email={email}
          canManageUsers={canManageUsers}
          canPrepareImports={canPrepareImports}
          showWorkforce={showWorkforce}
        />
        <SidebarInset id="ops-main-content" tabIndex={-1}>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger className="size-11 md:size-8" />
            <Separator orientation="vertical" className="h-4" />
            <p className="hidden text-sm text-muted-foreground sm:block">Staff workspace</p>
            <div className="ml-auto">
              <CommandPalette />
            </div>
          </header>
          <NoticeToaster />
          {demo ? (
            <Alert className="rounded-none border-x-0 border-t-0">
              <AlertDescription>
                Demo data is loaded because Cloudflare D1 is not connected.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex-1 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
