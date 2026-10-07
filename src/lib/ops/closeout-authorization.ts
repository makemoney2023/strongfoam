import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  CLOSEOUT_ROLE_PERMISSIONS,
  type CloseoutPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type CloseoutActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type CloseoutAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_CLOSEOUT_PERMISSIONS = CLOSEOUT_ROLE_PERMISSIONS.office;

export function resolveCloseoutAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: CloseoutPermission,
): CloseoutAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_CLOSEOUT_PERMISSIONS
      : CLOSEOUT_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that closeout action.",
    };
  }
  return { ok: true, organizationId };
}
