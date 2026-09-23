import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { purchaseOrderLines } from "@/db/schema";
import { isDemoOpsStore } from "@/lib/ops/demo-mode";
import { demoPurchaseSeed, seedWhenDemo } from "@/lib/ops/demo-operations";
import type { PurchaseOrder, PurchaseOrderLine } from "@/lib/ops/purchase-order";

type PurchaseMemory = {
  orders: PurchaseOrder[];
  lines: PurchaseOrderLine[];
};

export function purchaseOrderMemory(): PurchaseMemory {
  const globalForPurchase = globalThis as typeof globalThis & {
    __strongfoamPurchaseOrders?: PurchaseMemory;
  };
  globalForPurchase.__strongfoamPurchaseOrders ??= seedWhenDemo(
    () => demoPurchaseSeed(),
    { orders: [], lines: [] },
  );
  return globalForPurchase.__strongfoamPurchaseOrders;
}

export function resetPurchaseOrderMemory(): void {
  const globalForPurchase = globalThis as typeof globalThis & {
    __strongfoamPurchaseOrders?: PurchaseMemory;
  };
  globalForPurchase.__strongfoamPurchaseOrders = { orders: [], lines: [] };
}

export function materialRequestCitedInMemory(noteId: string): boolean {
  return purchaseOrderMemory().lines.some((line) => line.materialRequestId === noteId);
}

export async function materialRequestIsCited(noteId: string): Promise<boolean> {
  if (isDemoOpsStore()) return materialRequestCitedInMemory(noteId);
  const rows = await getDb()
    .select({ id: purchaseOrderLines.id })
    .from(purchaseOrderLines)
    .where(eq(purchaseOrderLines.materialRequestId, noteId))
    .limit(1);
  return Boolean(rows[0]);
}
