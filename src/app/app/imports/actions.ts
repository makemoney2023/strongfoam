"use server";

import { getOpsSession } from "@/lib/ops/auth";
import { invalid, type ActionState } from "@/lib/ops/action-result";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { isImportEntityType } from "@/lib/ops/import-contract";
import { getImportRepository } from "@/lib/ops/import-store";

async function prepareSession() {
  const session = await getOpsSession();
  if (!session) return { ok: false as const, error: "Sign in to import data." };
  const access = resolveImportAccess(session, "data.import.prepare");
  if (!access.ok) return { ok: false as const, error: access.error };
  return { ok: true as const, session, organizationId: access.organizationId };
}

export async function uploadImport(formData: FormData): Promise<ActionState> {
  const actor = await prepareSession();
  if (!actor.ok) return invalid(actor.error);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return invalid("Choose a CSV or XLSX file.", "file");
  }
  const entity = String(formData.get("entityType") ?? "");
  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await getImportRepository().saveUpload({
    organizationId: actor.organizationId,
    actor: actor.session.email,
    filename: file.name || "import.csv",
    contentType: file.type,
    bytes,
    entityType: isImportEntityType(entity) ? entity : null,
  });
  if (!saved.ok) return invalid(saved.error, "file");
  return {
    href: `/app/imports/${saved.batch.id}`,
    notice: {
      kind: "success",
      message: saved.duplicate
        ? "That file was already staged. Opened the existing import."
        : "The file is staged. Nothing was written to companies, jobs, or the price book yet.",
    },
  };
}

export async function commitImport(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) return invalid("Sign in to import data.");
  const access = resolveImportAccess(session, "data.import.commit");
  if (!access.ok) return invalid(access.error);
  const batchId = String(formData.get("batchId") ?? "");
  const result = await getImportRepository().commit({
    organizationId: access.organizationId,
    batchId,
    actor: session.email,
    durable: !isDemoOpsStore(),
  });
  if (!result.ok) return invalid(result.error);
  const demo = !result.batch.durable;
  return {
    href: `/app/imports/${result.batch.id}`,
    notice: {
      kind: "success",
      message: demo
        ? "Demo preview only. Nothing was written to the live database."
        : result.already
          ? "This import was already committed. The original records were kept."
          : "Import committed. Price-book changes are drafts, and imported users stay inactive.",
    },
  };
}

export async function cancelImport(formData: FormData): Promise<ActionState> {
  const actor = await prepareSession();
  if (!actor.ok) return invalid(actor.error);
  const batchId = String(formData.get("batchId") ?? "");
  const result = await getImportRepository().cancel({
    organizationId: actor.organizationId,
    batchId,
    actor: actor.session.email,
  });
  if (!result.ok) return invalid(result.error);
  return {
    href: `/app/imports/${result.batch.id}`,
    notice: { kind: "success", message: "Import cancelled. No business records were changed." },
  };
}
