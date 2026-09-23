import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  LABOR_ROLE_PERMISSIONS,
  type LaborPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type LaborActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
  userId?: string;
};

export type LaborAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_LABOR_PERMISSIONS = LABOR_ROLE_PERMISSIONS.office;

export function resolveLaborAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: LaborPermission,
): LaborAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_LABOR_PERMISSIONS
      : LABOR_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that labor action.",
    };
  }
  return { ok: true, organizationId };
}
