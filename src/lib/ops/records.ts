import { isOpportunityStage, type OpportunityStage } from "@/lib/ops/crm";

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "complete",
  "closed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  closed: "Closed",
};

export type CompanyInput = {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
};

export type ContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string | null;
};

export type SiteInput = {
  name: string;
  city: string;
  province: string;
};

export type OpportunityUpdateInput = {
  name: string;
  stage: OpportunityStage;
  owner: string | null;
};

export type ProjectUpdateInput = {
  name: string;
  status: ProjectStatus;
  projectManager: string | null;
};

const MAX_SHORT_TEXT_LENGTH = 160;

function requireName(value: string | undefined, label: string, field = "name") {
  const name = value?.trim() ?? "";
  if (!name) return { ok: false as const, error: `A ${label} is required.`, field };
  if (name.length > MAX_SHORT_TEXT_LENGTH) {
    return {
      ok: false as const,
      error: `${label[0].toUpperCase()}${label.slice(1)}s must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer.`,
      field,
    };
  }
  return { ok: true as const, value: name };
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus);
}

export function parseCompanyInput(input: {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  province?: string;
}): { ok: true; value: CompanyInput } | { ok: false; error: string; field?: string } {
  const name = requireName(input.name, "company name");
  if (!name.ok) return name;
  const email = input.email?.trim() || null;
  if (email && !email.includes("@")) {
    return { ok: false, error: "A valid company email is required.", field: "email" };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      email,
      phone: input.phone?.trim() || null,
      city: input.city?.trim() || null,
      province: input.province?.trim() || null,
    },
  };
}

export function parseContactInput(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
}): { ok: true; value: ContactInput } | { ok: false; error: string; field?: string } {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!firstName) {
    return { ok: false, error: "A contact first name is required.", field: "firstName" };
  }
  if (!lastName) {
    return { ok: false, error: "A contact last name is required.", field: "lastName" };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid contact email is required.", field: "email" };
  }
  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      phone: input.phone?.trim() || "",
      role: input.role?.trim() || null,
    },
  };
}

export function parseSiteInput(input: {
  name?: string;
  city?: string;
  province?: string;
}): { ok: true; value: SiteInput } | { ok: false; error: string; field?: string } {
  const name = requireName(input.name, "site name");
  if (!name.ok) return name;
  const city = input.city?.trim() ?? "";
  const province = input.province?.trim() ?? "";
  if (!city) {
    return { ok: false, error: "A site city is required.", field: "city" };
  }
  if (!province) {
    return { ok: false, error: "A site province is required.", field: "province" };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      city,
      province,
    },
  };
}

export function parseOpportunityUpdate(input: {
  name?: string;
  stage?: string;
  owner?: string;
}): { ok: true; value: OpportunityUpdateInput } | { ok: false; error: string; field?: string } {
  const name = requireName(input.name, "opportunity name");
  if (!name.ok) return name;
  const stage = input.stage ?? "";
  if (!isOpportunityStage(stage)) {
    return { ok: false, error: "Choose a valid opportunity stage.", field: "stage" };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      stage,
      owner: input.owner?.trim() || null,
    },
  };
}

export function parseProjectUpdate(input: {
  name?: string;
  status?: string;
  projectManager?: string;
}): { ok: true; value: ProjectUpdateInput } | { ok: false; error: string; field?: string } {
  const name = requireName(input.name, "project name");
  if (!name.ok) return name;
  const status = input.status ?? "active";
  if (!isProjectStatus(status)) {
    return { ok: false, error: "Choose a valid project status.", field: "status" };
  }
  return {
    ok: true,
    value: {
      name: name.value,
      status,
      projectManager: input.projectManager?.trim() || null,
    },
  };
}
