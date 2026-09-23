import { organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  EQUIPMENT_ROLE_PERMISSIONS,
  type EquipmentPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export type EquipmentActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email: string;
};

export type EquipmentAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

const OFFICE_EQUIPMENT_PERMISSIONS = EQUIPMENT_ROLE_PERMISSIONS.office;

export function resolveEquipmentAccess(
  session: { role: MembershipRole | "estimator"; organizationId?: string },
  permission: EquipmentPermission,
): EquipmentAccess {
  const organizationId = organizationIdForOpsSession(session);
  const allowed =
    session.role === "estimator"
      ? OFFICE_EQUIPMENT_PERMISSIONS
      : EQUIPMENT_ROLE_PERMISSIONS[session.role];
  if (!allowed.includes(permission)) {
    return {
      ok: false,
      error: "You do not have access to that equipment action.",
    };
  }
  return { ok: true, organizationId };
}
