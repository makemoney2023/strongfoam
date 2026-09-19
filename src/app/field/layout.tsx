import { FieldShell } from "@/components/field/field-shell";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { getFieldSession } from "@/lib/ops/field-auth";

export default async function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getFieldSession();
  if (!session) {
    return <div className="min-h-dvh bg-muted/40">{children}</div>;
  }
  return (
    <FieldShell displayName={session.displayName} demo={isDemoOpsStore()}>
      {children}
    </FieldShell>
  );
}
