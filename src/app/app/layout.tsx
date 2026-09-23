import { AppShell } from "@/components/ops/app-shell";
import { canManageUsers, getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { resolveWorkforceAccess } from "@/lib/ops/workforce-authorization";
import { workforcePerformanceEnabled } from "@/lib/ops/workforce-performance";

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOpsSession();

  if (!session) {
    return <div className="min-h-full bg-muted/40">{children}</div>;
  }

  return (
    <AppShell
      email={session.email}
      demo={isDemoOpsStore()}
      canManageUsers={canManageUsers(session)}
      canPrepareImports={resolveImportAccess(session, "data.import.prepare").ok}
      showWorkforce={
        workforcePerformanceEnabled() && resolveWorkforceAccess(session, "workforce.read").ok
      }
    >
      {children}
    </AppShell>
  );
}
