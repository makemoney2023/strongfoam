import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getOpsSession()) {
    redirect("/app/requests");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-[color:var(--sf-mist,#e9edef)] px-4 py-24 text-[color:var(--sf-ink)]">
      <form
        action="/api/ops/login"
        method="post"
        className="w-full max-w-md rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-8 shadow-sm"
      >
        <p className="section-kicker mb-3 text-[color:var(--sf-cyan)]">
          Operations
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Review estimate requests
        </h1>
        <p className="mt-3 text-sm text-[color:var(--sf-ink)]/70">
          Staff access only. Use a configured estimator email and shared
          operations password.
        </p>
        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-md bg-[color:var(--sf-red)]/10 px-3 py-2 text-sm text-[color:var(--sf-red)]"
          >
            Those credentials are not authorized.
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11"
            />
          </div>
        </div>
        <Button type="submit" className="mt-6 h-11 w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
