import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardDescription>Operations</CardDescription>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Staff access only. Use a configured estimator email and the shared
            operations password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/ops/login" method="post" className="space-y-4">
            {params.error ? (
              <Alert variant="destructive">
                <AlertDescription>Those credentials are not authorized.</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
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
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
