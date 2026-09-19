"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import { hashPassword } from "@/lib/ops/credentials";
import { parseUserInput } from "@/lib/ops/identity";
import { addUser, setUserActive } from "@/lib/ops/store";

function refreshUsers() {
  revalidatePath("/app/users");
  revalidatePath("/app/jobs");
  revalidatePath("/app/projects");
  revalidatePath("/field");
}

export async function createUser(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const parsed = parseUserInput({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
  });
  if (!parsed.ok) return invalidFrom(parsed);

  const user = await addUser({
    actor: session.email,
    displayName: parsed.value.displayName,
    email: parsed.value.email,
    role: parsed.value.role,
    passwordHash: await hashPassword(parsed.value.temporaryPassword),
  });
  if (!user) {
    return fail("/app/users", "A user with that email already exists.");
  }
  refreshUsers();
  return succeed("/app/users", `${user.displayName} can now sign in.`);
}

export async function changeUserActive(
  formData: FormData,
): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!userId) return fail("/app/users", "Missing user.");
  const user = await setUserActive({ userId, active });
  if (!user) return fail("/app/users", "That user could not be updated.");
  refreshUsers();
  return succeed(
    "/app/users",
    active ? `${user.displayName} activated.` : `${user.displayName} deactivated.`,
  );
}
