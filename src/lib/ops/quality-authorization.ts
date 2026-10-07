import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  QUALITY_ROLE_PERMISSIONS,
  type MembershipRole,
  type QualityPermission,
} from "@/lib/ops/identity";

export type QualityActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type QualityAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_QUALITY_PERMISSIONS = QUALITY_ROLE_PERMISSIONS.office;

export function resolveQualityAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: QualityPermission,
): QualityAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_QUALITY_PERMISSIONS
      : QUALITY_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that quality action.",
    };
  }
  return { ok: true, organizationId };
}
