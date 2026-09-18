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

export function AppShell({
  email,
  demo,
  children,
}: {
  email: string;
  demo: boolean;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar email={email} />
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <p className="text-sm text-muted-foreground">Staff workspace</p>
          </header>
          {demo ? (
            <Alert className="rounded-none border-x-0 border-t-0">
              <AlertDescription>
                Demo data is loaded because Postgres is not connected. Set
                DATABASE_URL and run migrations to use live records.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
