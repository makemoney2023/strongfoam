import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  COMMERCIAL_ROLE_PERMISSIONS,
  type CommercialPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type CommercialActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
};

export type CommercialAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_COMMERCIAL_PERMISSIONS = COMMERCIAL_ROLE_PERMISSIONS.office;

export function resolveCommercialAccess(
  session: CommercialActor,
  permission: CommercialPermission,
  claimedOrganizationId?: string | null,
): CommercialAccess {
  const organizationId = organizationIdForOpsSession(session);
  // Form data may include an organization, and it is never the source of scope.
  void claimedOrganizationId;

  const allowed =
    session.role === "estimator"
      ? OFFICE_COMMERCIAL_PERMISSIONS
      : COMMERCIAL_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that commercial action.",
    };
  }
  return { ok: true, organizationId };
}

export function assertSameOrganization(
  left: string,
  right: string,
): { ok: true } | { ok: false; error: string } {
  if (left !== right) {
    return {
      ok: false,
      error: "That record is outside this organization.",
    };
  }
  return { ok: true };
}
