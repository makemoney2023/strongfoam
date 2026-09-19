import type { ActionState } from "@/lib/ops/action-result";

export async function succeed(path: string, message = "Saved."): Promise<ActionState> {
  return { href: path, notice: { kind: "success", message } };
}

export async function fail(path: string, error: string): Promise<ActionState> {
  return { href: path, error, notice: { kind: "error", message: error } };
}
