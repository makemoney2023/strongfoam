"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { parsePriceBookItem } from "@/lib/ops/price-book";
import { addPriceBookItem, updatePriceBookItem } from "@/lib/ops/store";

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
  const parsed = readItem(formData);
  if (!parsed.ok) return invalidFrom(parsed);
  await addPriceBookItem({ ...parsed.value, createdBy: session.email });
  revalidatePath("/app/price-book");
  return succeed("/app/price-book", "Price-book item created.");
}

export async function savePriceBookItem(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/price-book", "Missing price-book item.");
  const parsed = readItem(formData);
  if (!parsed.ok) return invalidFrom(parsed);
  const item = await updatePriceBookItem(id, parsed.value);
  if (!item) return fail("/app/price-book", "That price-book item could not be updated.");
  revalidatePath("/app/price-book");
  return succeed("/app/price-book", "Price-book item saved.");
}
