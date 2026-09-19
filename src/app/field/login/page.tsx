import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
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
import {
  DEMO_FIELD_EMAIL,
  DEMO_FIELD_PASSWORD,
} from "@/lib/ops/demo-data";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { getFieldSession } from "@/lib/ops/field-auth";

export const dynamic = "force-dynamic";

export default async function FieldLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getFieldSession()) redirect("/field");
  const query = await searchParams;
  const demo = isDemoOpsStore();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <BrandLogo variant="onLight" priority />
          <div>
            <CardTitle>Field sign in</CardTitle>
            <CardDescription>
              Use the account created for you in Strong Foam Operations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {query.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                The email or password was not accepted, or this Field account is inactive.
              </AlertDescription>
            </Alert>
          ) : null}
          {demo ? (
            <Alert>
              <AlertDescription>
                Demo login: {DEMO_FIELD_EMAIL} / {DEMO_FIELD_PASSWORD}
              </AlertDescription>
            </Alert>
          ) : null}
          <form action="/api/field/login" method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-email">Email</Label>
              <Input
                id="field-email"
                name="email"
                type="email"
                autoComplete="username"
                defaultValue={demo ? DEMO_FIELD_EMAIL : ""}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-password">Password</Label>
              <Input
                id="field-password"
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue={demo ? DEMO_FIELD_PASSWORD : ""}
                className="h-12"
                required
              />
            </div>
            <Button type="submit" className="min-h-12 w-full">
              Sign in to Field
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
