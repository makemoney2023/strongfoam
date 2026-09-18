import Image from "next/image";
import Link from "next/link";
import { getOpsSession } from "@/lib/ops/auth";
import { useDemoOpsStore } from "@/lib/ops/demo-store";

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOpsSession();

  if (!session) {
    return <div className="min-h-full bg-[color:var(--sf-mist,#e9edef)]">{children}</div>;
  }

  return (
    <div className="min-h-full bg-[color:var(--sf-mist,#e9edef)] text-[color:var(--sf-ink)]">
      <header className="border-b border-[color:var(--sf-ink)]/10 bg-white">
        <div className="page-rail flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/app/requests" className="relative block h-9 w-36">
              <Image
                src="/media/brand/SFI-Logo-Jpeg-EDIT_00-removebg-preview.png"
                alt="Strong Foam Insulation"
                fill
                className="object-contain object-left"
                sizes="144px"
              />
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-semibold md:flex">
              <Link href="/app/requests" className="hover:text-[color:var(--sf-cyan)]">
                Estimate requests
              </Link>
              <Link href="/app/companies" className="hover:text-[color:var(--sf-cyan)]">
                Companies
              </Link>
              <Link href="/app/opportunities" className="hover:text-[color:var(--sf-cyan)]">
                Opportunities
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[color:var(--sf-ink)]/65 sm:inline">
              {session.email}
            </span>
            <form action="/api/ops/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-8 items-center rounded-md border border-[color:var(--sf-ink)]/15 px-3 text-sm font-medium hover:bg-[color:var(--sf-mist,#e9edef)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {useDemoOpsStore() ? (
        <p className="bg-[color:var(--sf-cyan)]/12 px-4 py-2 text-center text-sm text-[color:var(--sf-ink)]">
          Demo data is loaded because Postgres is not connected. Set
          DATABASE_URL and run the review migration to use live requests.
        </p>
      ) : null}
      {children}
    </div>
  );
}
