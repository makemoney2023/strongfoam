import { redirect } from "next/navigation";
import { setOpsNotice } from "@/lib/ops/notice";

export type ActionState = {
  error?: string;
  fields?: Record<string, string>;
};

export const EMPTY_ACTION_STATE: ActionState = {};

export function invalid(error: string, field?: string): ActionState {
  return field ? { error, fields: { [field]: error } } : { error };
}

export function invalidFrom(result: { error: string; field?: string }): ActionState {
  return invalid(result.error, result.field);
}

export async function succeed(path: string, message = "Saved."): Promise<never> {
  await setOpsNotice({ kind: "success", message });
  redirect(path);
}

export async function fail(path: string, error: string): Promise<never> {
  await setOpsNotice({ kind: "error", message: error });
  redirect(path);
}

export function safeReturnTo(value: string, fallback: string): string {
  return value.startsWith("/app/") ? value.split("?")[0] : fallback;
}
