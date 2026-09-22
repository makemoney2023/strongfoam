"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import {
  hasAllowedBidDocumentSignature,
  MAX_BID_UPLOAD_FILES,
  parseBidDocumentInput,
} from "@/lib/ops/commercial-documents";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
import { parseOpportunityUpdate } from "@/lib/ops/records";
import {
  deleteOpportunity,
  recordQuarantinedBidDocument,
  retryBidDocumentScan as queueBidDocumentScan,
  updateOpportunity,
} from "@/lib/ops/store";

export async function saveOpportunity(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseOpportunityUpdate({
    name: String(formData.get("name") ?? ""),
    stage: String(formData.get("stage") ?? ""),
    owner: String(formData.get("owner") ?? ""),
  });
  if (!id) return fail("/app/opportunities", "Missing opportunity.");
  if (!parsed.ok) return invalidFrom(parsed);
  const opportunity = await updateOpportunity({ id, input: parsed.value });
  if (!opportunity) return fail(`/app/opportunities/${id}`, "That opportunity could not be updated.");
  revalidatePath("/app/opportunities");
  revalidatePath(`/app/opportunities/${id}`);
  revalidatePath("/app/companies");
  return succeed(`/app/opportunities/${id}`, "Opportunity saved.");
}

function opportunityPath(opportunityId: string): string {
  return opportunityId
    ? `/app/opportunities/${opportunityId}`
    : "/app/opportunities";
}

function bidUploadFiles(formData: FormData): File[] {
  return formData
    .getAll("file")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function uploadBidPackage(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const path = opportunityPath(opportunityId);
  if (!opportunityId) return fail("/app/opportunities", "Missing opportunity.");
  const access = resolveCommercialAccess(
    session,
    "estimate.edit",
    String(formData.get("organizationId") ?? ""),
  );
  if (!access.ok) return fail(path, access.error);
  if (!isDemoOpsStore()) {
    return fail(
      path,
      "Production documents must use the configured Blob upload flow.",
    );
  }

  const files = bidUploadFiles(formData);
  if (files.length === 0) {
    return fail(path, "Choose at least one PDF, JPEG, PNG, or WebP file.");
  }
  if (files.length > MAX_BID_UPLOAD_FILES) {
    return fail(path, `Upload up to ${MAX_BID_UPLOAD_FILES} files at a time.`);
  }

  const uploaded: string[] = [];
  const failed: string[] = [];
  for (const file of files) {
    const parsed = parseBidDocumentInput({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind: String(formData.get("kind") ?? ""),
      revisionLabel: String(formData.get("revisionLabel") ?? ""),
    });
    if (!parsed.ok) {
      failed.push(`${file.name}: ${parsed.error}`);
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasAllowedBidDocumentSignature(bytes, parsed.value.contentType)) {
      failed.push(`${file.name}: the file contents do not match the selected type.`);
      continue;
    }
    const safeName = parsed.value.filename.replace(/[^\w.\-]+/g, "_");
    const recorded = await recordQuarantinedBidDocument({
      organizationId: access.organizationId,
      opportunityId,
      documentId: null,
      actor: session.email,
      input: parsed.value,
      pathname: `opportunities/${access.organizationId}/${opportunityId}/${crypto.randomUUID()}-${safeName}`,
      bytes,
    });
    if (!recorded) {
      failed.push(`${file.name}: could not be saved.`);
      continue;
    }
    uploaded.push(file.name);
  }

  revalidatePath(path);
  if (uploaded.length === 0) {
    return fail(path, failed[0] ?? "Those files could not be uploaded.");
  }
  if (failed.length > 0) {
    return succeed(path, `${uploaded.length} uploaded. ${failed[0]}`);
  }
  return succeed(
    path,
    "Bid package uploaded. It stays in quarantine until it is scanned.",
  );
}

export async function retryBidDocumentScan(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const path = opportunityPath(opportunityId);
  if (!opportunityId || !versionId) {
    return fail(path, "Missing bid document.");
  }
  const access = resolveCommercialAccess(session, "estimate.edit");
  if (!access.ok) return fail(path, access.error);
  const result = await queueBidDocumentScan({
    organizationId: access.organizationId,
    opportunityId,
    versionId,
  });
  revalidatePath(path);
  if (!result.ok) return fail(path, result.error);
  return succeed(path, "Scan queued.");
}

export async function removeOpportunity(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/opportunities", "Missing opportunity.");
  const result = await deleteOpportunity(id);
  if (!result.ok) return fail(`/app/opportunities/${id}`, result.error);
  revalidatePath("/app/opportunities");
  revalidatePath("/app/companies");
  return succeed("/app/opportunities", "Opportunity deleted.");
}
