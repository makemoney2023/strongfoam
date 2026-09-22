import { isConfiguredAdminEmail, organizationIdForOpsSession } from "@/lib/ops/auth";
import {
  DATA_IMPORT_PERMISSIONS,
  DATA_IMPORT_ROLE_PERMISSIONS,
  type DataImportPermission,
  type MembershipRole,
} from "@/lib/ops/identity";

export { DATA_IMPORT_PERMISSIONS };

export type ImportActor = {
  role: MembershipRole | "estimator";
  organizationId?: string;
  email?: string;
};

export type ImportAccess =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

export function resolveImportAccess(
  session: ImportActor,
  permission: DataImportPermission,
  claimedOrganizationId?: string | null,
  env: Record<string, string | undefined> = process.env,
): ImportAccess {
  const organizationId = organizationIdForOpsSession(session);
  // A form or spreadsheet may name an organization. Scope always comes from the session.
  void claimedOrganizationId;

  const allowed =
    session.role === "estimator"
      ? session.email && isConfiguredAdminEmail(session.email, env)
        ? DATA_IMPORT_ROLE_PERMISSIONS.administrator
        : DATA_IMPORT_ROLE_PERMISSIONS.office
      : DATA_IMPORT_ROLE_PERMISSIONS[session.role];

  if (!allowed.includes(permission)) {
    return { ok: false, error: "You do not have access to data import." };
  }
  return { ok: true, organizationId };
}

export function canPrepareImports(session: ImportActor): boolean {
  return resolveImportAccess(session, "data.import.prepare").ok;
}
