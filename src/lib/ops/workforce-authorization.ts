import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  WORKFORCE_ROLE_PERMISSIONS,
  type MembershipRole,
  type WorkforcePermission,
} from "@/lib/ops/identity";

export type WorkforceActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
  userId?: string;
};

export type WorkforceAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_WORKFORCE_PERMISSIONS = WORKFORCE_ROLE_PERMISSIONS.office;

export function resolveWorkforceAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: WorkforcePermission,
): WorkforceAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_WORKFORCE_PERMISSIONS
      : WORKFORCE_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return { ok: false, error: "You do not have access to that workforce action." };
  }
  return { ok: true, organizationId };
}
