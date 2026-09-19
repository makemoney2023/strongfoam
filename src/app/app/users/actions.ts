"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, succeed } from "@/lib/ops/action-redirect";
import { invalidFrom, type ActionState } from "@/lib/ops/action-result";
import { canManageUsers, getOpsSession } from "@/lib/ops/auth";
import { hashPassword } from "@/lib/ops/credentials";
import {
  isFieldMembershipRole,
  parsePasswordResetInput,
  parseUserInput,
  parseUserUpdateInput,
} from "@/lib/ops/identity";
import {
  addUser,
  countActiveAdministrators,
  getUserAssignmentSummary,
  getUserIdentityById,
  resetUserPassword as resetStoredUserPassword,
  revokeUserSessions as revokeStoredUserSessions,
  setUserActive,
  updateUser as updateStoredUser,
} from "@/lib/ops/store";

function refreshUsers() {
  revalidatePath("/app/users");
  revalidatePath("/app/jobs");
  revalidatePath("/app/projects");
  revalidatePath("/field");
}

async function getAdministrator() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  return canManageUsers(session) ? session : null;
}

export async function createUser(formData: FormData): Promise<ActionState> {
  const session = await getAdministrator();
  if (!session) return fail("/app", "Administrator access is required.");
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
  const session = await getAdministrator();
  if (!session) return fail("/app", "Administrator access is required.");
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!userId) return fail("/app/users", "Missing user.");
  const existing = await getUserIdentityById(userId);
  if (!existing) return fail("/app/users", "That user could not be updated.");
  if (!active && "userId" in session && session.userId === userId) {
    return fail("/app/users", "You cannot deactivate your own account.");
  }
  if (
    !active &&
    existing.role === "administrator" &&
    existing.active &&
    existing.membershipActive &&
    (await countActiveAdministrators()) <= 1
  ) {
    return fail("/app/users", "At least one active administrator is required.");
  }
  const user = await setUserActive({
    userId,
    active,
    actor: session.email,
  });
  if (!user) return fail("/app/users", "That user could not be updated.");
  refreshUsers();
  return succeed(
    "/app/users",
    active ? `${user.displayName} activated.` : `${user.displayName} deactivated.`,
  );
}

export async function updateUser(
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdministrator();
  if (!session) return fail("/app", "Administrator access is required.");
  const userId = String(formData.get("userId") ?? "");
  const parsed = parseUserUpdateInput({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!userId) return fail("/app/users", "Missing user.");
  if (!parsed.ok) return invalidFrom(parsed);
  const existing = await getUserIdentityById(userId);
  if (!existing) return fail("/app/users", "That user could not be updated.");
  if (
    existing.role === "administrator" &&
    existing.active &&
    existing.membershipActive &&
    parsed.value.role !== "administrator"
  ) {
    if ("userId" in session && session.userId === userId) {
      return fail("/app/users", "You cannot remove your own administrator role.");
    }
    if ((await countActiveAdministrators()) <= 1) {
      return fail("/app/users", "At least one active administrator is required.");
    }
  }
  if (
    isFieldMembershipRole(existing.role) &&
    !isFieldMembershipRole(parsed.value.role)
  ) {
    const assignments = await getUserAssignmentSummary(userId);
    if (assignments.jobAssignments + assignments.taskAssignments > 0) {
      return fail(
        "/app/users",
        "Remove this user's job and task assignments before changing to an Office role.",
      );
    }
  }
  const user = await updateStoredUser({
    userId,
    actor: session.email,
    input: parsed.value,
  });
  if (!user) {
    return fail("/app/users", "That email is already used or the user changed.");
  }
  refreshUsers();
  return succeed("/app/users", `${user.displayName} updated.`);
}

export async function resetUserPassword(
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdministrator();
  if (!session) return fail("/app", "Administrator access is required.");
  const userId = String(formData.get("userId") ?? "");
  const parsed = parsePasswordResetInput({
    temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
  });
  if (!userId) return fail("/app/users", "Missing user.");
  if (!parsed.ok) return invalidFrom(parsed);
  const user = await resetStoredUserPassword({
    userId,
    actor: session.email,
    passwordHash: await hashPassword(parsed.value.temporaryPassword),
  });
  if (!user) return fail("/app/users", "That user could not be updated.");
  refreshUsers();
  return succeed(
    "/app/users",
    `${user.displayName}'s password and sessions were reset.`,
  );
}

export async function revokeUserSessions(
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdministrator();
  if (!session) return fail("/app", "Administrator access is required.");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return fail("/app/users", "Missing user.");
  const user = await revokeStoredUserSessions({
    userId,
    actor: session.email,
  });
  if (!user) return fail("/app/users", "That user could not be updated.");
  refreshUsers();
  return succeed("/app/users", `${user.displayName}'s sessions were revoked.`);
}
