import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  INSPECTION_ROLE_PERMISSIONS,
  type InspectionPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type InspectionActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type InspectionAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_INSPECTION_PERMISSIONS = INSPECTION_ROLE_PERMISSIONS.office;

export function resolveInspectionAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: InspectionPermission,
): InspectionAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_INSPECTION_PERMISSIONS
      : INSPECTION_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that inspection action.",
    };
  }
  return { ok: true, organizationId };
}
