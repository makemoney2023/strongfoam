import { cookies } from "next/headers";
import { AppShell } from "@/components/ops/app-shell";
import { getOpsSession } from "@/lib/ops/auth";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { OPS_NOTICE_COOKIE, parseOpsNotice } from "@/lib/ops/notice";

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOpsSession();

  if (!session) {
    return <div className="min-h-full bg-muted/40">{children}</div>;
  }

  const noticeKey = (await cookies()).get(OPS_NOTICE_COOKIE)?.value ?? null;

  return (
    <AppShell
      email={session.email}
      demo={isDemoOpsStore()}
      notice={parseOpsNotice(noticeKey)}
      noticeKey={noticeKey}
    >
      {children}
    </AppShell>
  );
}
