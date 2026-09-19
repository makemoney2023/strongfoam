import Link from "next/link";
import { HardHatIcon, LogOutIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FieldShell({
  children,
  displayName,
  demo,
}: {
  children: React.ReactNode;
  displayName: string;
  demo: boolean;
}) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/field" aria-label="Field home" className="shrink-0">
            <BrandLogo variant="onLight" priority />
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {demo ? <Badge variant="outline">Demo</Badge> : null}
            <span className="hidden truncate text-sm text-muted-foreground sm:block">
              {displayName}
            </span>
            <form action="/api/field/logout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="min-h-11"
              >
                <LogOutIcon aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-24">{children}</main>
      <nav
        aria-label="Field navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/field" />}
            variant="ghost"
            className="min-h-12 min-w-32"
          >
            <HardHatIcon aria-hidden="true" />
            My jobs
          </Button>
        </div>
      </nav>
    </div>
  );
}
