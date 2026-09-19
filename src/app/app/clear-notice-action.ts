"use server";

import { cookies } from "next/headers";
import { OPS_NOTICE_COOKIE } from "@/lib/ops/notice";

export async function clearOpsNotice() {
  const jar = await cookies();
  jar.delete(OPS_NOTICE_COOKIE);
}
