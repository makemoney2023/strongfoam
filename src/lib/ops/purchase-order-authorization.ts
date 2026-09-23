import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  PURCHASE_ORDER_ROLE_PERMISSIONS,
  type MembershipRole,
  type PurchaseOrderPermission,
} from "@/lib/ops/identity";

export type PurchaseActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type PurchaseAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_PURCHASE_PERMISSIONS = PURCHASE_ORDER_ROLE_PERMISSIONS.office;

export function resolvePurchaseAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: PurchaseOrderPermission,
): PurchaseAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_PURCHASE_PERMISSIONS
      : PURCHASE_ORDER_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that purchase order action.",
    };
  }
  return { ok: true, organizationId };
}
