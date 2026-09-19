"use server";

import { getOpsSession } from "@/lib/ops/auth";
import { searchOps, type SearchHit } from "@/lib/ops/search";

export async function searchOpsAction(query: string): Promise<SearchHit[]> {
  const session = await getOpsSession();
  if (!session) return [];
  return searchOps(query);
}
