import { isUuid } from "@/lib/ops/job-workspace";

export const STRONG_FOAM_ORGANIZATION_ID =
  "00000000-0000-4000-8000-000000000001";

export const MEMBERSHIP_ROLES = [
  "administrator",
  "office",
  "field_lead",
  "field_worker",
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  administrator: "Administrator",
  office: "Office",
  field_lead: "Field lead",
  field_worker: "Field worker",
};

export const FIELD_MEMBERSHIP_ROLES = ["field_lead", "field_worker"] as const;
export const OFFICE_MEMBERSHIP_ROLES = ["administrator", "office"] as const;

export const COMMERCIAL_PERMISSIONS = [
  "estimate.read",
  "estimate.edit",
  "estimate.approve",
  "proposal.deliver",
  "estimate.convert",
  "change_order.read",
  "change_order.edit",
  "change_order.approve",
] as const;

export type CommercialPermission = (typeof COMMERCIAL_PERMISSIONS)[number];

export const COMMERCIAL_ROLE_PERMISSIONS: Record<
  MembershipRole,
  readonly CommercialPermission[]
> = {
  administrator: COMMERCIAL_PERMISSIONS,
  office: ["estimate.read", "estimate.edit", "change_order.read", "change_order.edit"],
  field_lead: [],
  field_worker: [],
};

export const DISPATCH_PERMISSIONS = ["dispatch.read", "dispatch.edit"] as const;

export type DispatchPermission = (typeof DISPATCH_PERMISSIONS)[number];

export const DISPATCH_ROLE_PERMISSIONS: Record<
  MembershipRole,
  readonly DispatchPermission[]
> = {
  administrator: DISPATCH_PERMISSIONS,
  office: DISPATCH_PERMISSIONS,
  field_lead: ["dispatch.read"],
  field_worker: ["dispatch.read"],
};

export const LABOR_PERMISSIONS = ["labor.read", "labor.edit"] as const;

export type LaborPermission = (typeof LABOR_PERMISSIONS)[number];

export const LABOR_ROLE_PERMISSIONS: Record<
  MembershipRole,
  readonly LaborPermission[]
> = {
  administrator: LABOR_PERMISSIONS,
  office: LABOR_PERMISSIONS,
  field_lead: LABOR_PERMISSIONS,
  field_worker: LABOR_PERMISSIONS,
};

export const DATA_IMPORT_PERMISSIONS = [
  "data.import.prepare",
  "data.import.commit",
] as const;

export type DataImportPermission = (typeof DATA_IMPORT_PERMISSIONS)[number];

export const DATA_IMPORT_ROLE_PERMISSIONS: Record<
  MembershipRole,
  readonly DataImportPermission[]
> = {
  administrator: DATA_IMPORT_PERMISSIONS,
  office: ["data.import.prepare"],
  field_lead: [],
  field_worker: [],
};

export const JOB_ASSIGNMENT_ROLES = ["foreman", "technician"] as const;
export type JobAssignmentRole = (typeof JOB_ASSIGNMENT_ROLES)[number];

export const JOB_ASSIGNMENT_ROLE_LABELS: Record<JobAssignmentRole, string> = {
  foreman: "Foreman",
  technician: "Technician",
};

export type UserInput = {
  displayName: string;
  email: string;
  role: MembershipRole;
  temporaryPassword: string;
};

export type UserUpdateInput = Omit<UserInput, "temporaryPassword">;

export type UserIdentity = {
  userId: string;
  organizationId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  active: boolean;
  membershipActive: boolean;
  role: MembershipRole;
  sessionVersion: number;
};

export type UserListItem = UserIdentity & {
  createdAt: Date;
  updatedAt: Date;
};

export type JobAssignmentView = {
  id: string;
  jobId: string;
  userId: string;
  role: JobAssignmentRole;
  displayName: string;
  email: string;
  active: boolean;
  createdAt: Date;
};

export function isMembershipRole(value: string): value is MembershipRole {
  return MEMBERSHIP_ROLES.includes(value as MembershipRole);
}

export function isFieldMembershipRole(
  value: string,
): value is (typeof FIELD_MEMBERSHIP_ROLES)[number] {
  return FIELD_MEMBERSHIP_ROLES.includes(
    value as (typeof FIELD_MEMBERSHIP_ROLES)[number],
  );
}

export function isOfficeMembershipRole(
  value: string,
): value is (typeof OFFICE_MEMBERSHIP_ROLES)[number] {
  return OFFICE_MEMBERSHIP_ROLES.includes(
    value as (typeof OFFICE_MEMBERSHIP_ROLES)[number],
  );
}

export function isJobAssignmentRole(
  value: string,
): value is JobAssignmentRole {
  return JOB_ASSIGNMENT_ROLES.includes(value as JobAssignmentRole);
}

function parseUserProfile(input: {
  displayName?: string;
  email?: string;
  role?: string;
}):
  | { ok: true; value: UserUpdateInput }
  | { ok: false; error: string; field?: string } {
  const displayName = input.displayName?.trim().replace(/\s+/g, " ") ?? "";
  if (displayName.length < 2 || displayName.length > 120) {
    return {
      ok: false,
      error: "Enter a name between 2 and 120 characters.",
      field: "displayName",
    };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return {
      ok: false,
      error: "Enter a valid email address.",
      field: "email",
    };
  }

  const role = input.role ?? "";
  if (!isMembershipRole(role)) {
    return { ok: false, error: "Choose a valid role.", field: "role" };
  }

  return { ok: true, value: { displayName, email, role } };
}

function parsePassword(password: string):
  | { ok: true; value: string }
  | { ok: false; error: string; field: "temporaryPassword" } {
  if (
    password.length < 12 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return {
      ok: false,
      error:
        "Temporary passwords need at least 12 characters, one letter, and one number.",
      field: "temporaryPassword",
    };
  }
  return { ok: true, value: password };
}

export function parseUserInput(input: {
  displayName?: string;
  email?: string;
  role?: string;
  temporaryPassword?: string;
}):
  | { ok: true; value: UserInput }
  | { ok: false; error: string; field?: string } {
  const profile = parseUserProfile(input);
  if (!profile.ok) return profile;
  const password = parsePassword(input.temporaryPassword ?? "");
  if (!password.ok) return password;

  return {
    ok: true,
    value: {
      ...profile.value,
      temporaryPassword: password.value,
    },
  };
}

export function parseUserUpdateInput(input: {
  displayName?: string;
  email?: string;
  role?: string;
}):
  | { ok: true; value: UserUpdateInput }
  | { ok: false; error: string; field?: string } {
  return parseUserProfile(input);
}

export function parsePasswordResetInput(input: {
  temporaryPassword?: string;
}):
  | { ok: true; value: { temporaryPassword: string } }
  | { ok: false; error: string; field?: string } {
  const password = parsePassword(input.temporaryPassword ?? "");
  return password.ok
    ? { ok: true, value: { temporaryPassword: password.value } }
    : password;
}

export function parseJobAssignmentInput(input: {
  userId?: string;
  role?: string;
}):
  | { ok: true; value: { userId: string; role: JobAssignmentRole } }
  | { ok: false; error: string; field?: string } {
  const userId = input.userId?.trim() ?? "";
  if (!isUuid(userId)) {
    return {
      ok: false,
      error: "Choose a valid field worker.",
      field: "userId",
    };
  }
  const role = input.role ?? "";
  if (!isJobAssignmentRole(role)) {
    return {
      ok: false,
      error: "Choose a valid assignment role.",
      field: "assignmentRole",
    };
  }
  return { ok: true, value: { userId, role } };
}
