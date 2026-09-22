"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import { parsePriceBookItem } from "@/lib/ops/price-book";
import {
  addPriceBookItem,
  approvePriceBookRevision,
  listPriceBookItems,
  listPriceBookVersions,
  savePriceBookDraft,
  updatePriceBookItem,
} from "@/lib/ops/store";

function readItem(formData: FormData) {
  return parsePriceBookItem({
    trade: String(formData.get("trade") ?? ""),
    name: String(formData.get("name") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    active: formData.get("active") ? "1" : "",
  });
}

export async function createPriceBookItem(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveCommercialAccess(session, "estimate.edit");
  if (!access.ok) return fail("/app/price-book", access.error);
  const parsed = readItem(formData);
  if (!parsed.ok) return invalidFrom(parsed);
  const item = await addPriceBookItem({ ...parsed.value, createdBy: session.email });
  await savePriceBookDraft({
    itemId: item.id,
    trade: parsed.value.trade,
    description: parsed.value.name,
    unit: parsed.value.unit,
    unitPriceCents: parsed.value.unitPriceCents,
    createdBy: session.email,
  });
  revalidatePath("/app/price-book");
  return succeed("/app/price-book", "Draft price revision created.");
}

export async function savePriceBookItem(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveCommercialAccess(session, "estimate.edit");
  if (!access.ok) return fail("/app/price-book", access.error);
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/price-book", "Missing price-book item.");
  const parsed = readItem(formData);
  if (!parsed.ok) return invalidFrom(parsed);
  const current = (await listPriceBookItems({ includeInactive: true })).find(
    (item) => item.id === id,
  );
  if (!current) return fail("/app/price-book", "That price-book item could not be updated.");
  const item = await updatePriceBookItem(id, {
    ...parsed.value,
    trade: current.trade as typeof parsed.value.trade,
    name: current.name,
    unit: current.unit as typeof parsed.value.unit,
    unitPriceCents: current.unitPriceCents,
  });
  if (!item) return fail("/app/price-book", "That price-book item could not be updated.");
  const approved = (await listPriceBookVersions([id]))
    .filter((version) => version.status === "approved")
    .at(-1);
  const unchanged =
    approved &&
    approved.trade === parsed.value.trade &&
    approved.description === parsed.value.name &&
    approved.unit === parsed.value.unit &&
    approved.unitPriceCents === parsed.value.unitPriceCents;
  if (!unchanged) {
    const draft = await savePriceBookDraft({
      itemId: id,
      trade: parsed.value.trade,
      description: parsed.value.name,
      unit: parsed.value.unit,
      unitPriceCents: parsed.value.unitPriceCents,
      createdBy: session.email,
    });
    if (!draft) return fail("/app/price-book", "That price revision could not be saved.");
  }
  revalidatePath("/app/price-book");
  return succeed(
    "/app/price-book",
    unchanged ? "Price-book item saved." : "Draft price revision saved.",
  );
}

export async function approvePriceBookItem(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const access = resolveCommercialAccess(session, "estimate.approve");
  if (!access.ok) return fail("/app/price-book", access.error);
  const itemId = String(formData.get("itemId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!itemId || !versionId) return fail("/app/price-book", "Missing price revision.");
  const result = await approvePriceBookRevision({
    itemId,
    versionId,
    approver: session.email,
  });
  revalidatePath("/app/price-book");
  if (!result.ok) return fail("/app/price-book", result.error);
  return succeed("/app/price-book", "Price revision approved.");
}
