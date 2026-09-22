import { getOpsSession } from "@/lib/ops/auth";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { isImportEntityType } from "@/lib/ops/import-contract";
import { importTemplateCsv } from "@/lib/ops/import-validation";

export async function GET(request: Request) {
  const session = await getOpsSession();
  if (!session) {
    return new Response("Sign in to download an import template.", { status: 401 });
  }
  const access = resolveImportAccess(session, "data.import.prepare");
  if (!access.ok) {
    return new Response(access.error, { status: 403 });
  }
  const entity = new URL(request.url).searchParams.get("entity") ?? "company";
  if (!isImportEntityType(entity)) {
    return new Response("That template is not available.", { status: 400 });
  }
  const body = importTemplateCsv(entity);
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${entity}-template.csv"`,
    },
  });
}
