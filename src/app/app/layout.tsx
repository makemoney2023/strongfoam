import { AppShell } from "@/components/ops/app-shell";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";

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
    <AppShell email={session.email} demo={isDemoOpsStore()}>
      {children}
    </AppShell>
  );
}
