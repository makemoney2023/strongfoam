import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  DISPATCH_ROLE_PERMISSIONS,
  type DispatchPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type DispatchActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type DispatchAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_DISPATCH_PERMISSIONS = DISPATCH_ROLE_PERMISSIONS.office;

export function resolveDispatchAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: DispatchPermission,
): DispatchAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_DISPATCH_PERMISSIONS
      : DISPATCH_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that dispatch action.",
    };
  }
  return { ok: true, organizationId };
}
